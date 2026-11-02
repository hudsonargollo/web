<?php

namespace App\Lab\Publish;

use App\Entitlement\EntitlementCatalog;
use App\Entitlement\EntitlementGate;
use App\Lab\LabProjectAccess;
use App\Lab\SiteWorkspace;
use App\Models\LabProject;
use App\Models\LabPublication;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;
use InvalidArgumentException;
use RuntimeException;
use Throwable;

final class LabPublicationManager
{
    public function __construct(
        private readonly LabPublishConfig $config,
        private readonly PublishHost $hosts,
        private readonly LabPublishArtifactDeployer $deployer,
        private readonly DomainDnsProbe $dns,
        private readonly SiteWorkspace $workspaces,
        private readonly EntitlementGate $entitlements,
    ) {}

    public function forProject(LabProject $project): LabPublication
    {
        $existing = LabPublication::query()->where('lab_project_id', $project->id)->first();
        if ($existing !== null) {
            return $existing;
        }

        $user = $project->user;
        $canPick = $user instanceof User
            && $this->entitlements->allows($user, EntitlementCatalog::CUSTOM_SUBDOMAIN);

        $slug = $canPick
            ? $this->uniqueSubdomain($this->hosts->suggestSubdomain($project->title, $project->uuid))
            : $this->uniqueRandomSubdomain();

        return LabPublication::query()->create([
            'lab_project_id' => $project->id,
            'kind' => LabPublication::KIND_SUBDOMAIN,
            'subdomain' => $slug,
            'status' => LabPublication::STATUS_IDLE,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    public function payload(LabProject $project, User $user): array
    {
        $publication = $this->forProject($project);

        return [
            'publication' => $this->serialize($publication),
            'config' => $this->configPayload($publication, $user),
        ];
    }

    /**
     * @param  array{kind: string, subdomain?: string|null, custom_host?: string|null}  $input
     * @return array<string, mixed>
     */
    public function saveAndPublish(LabProject $project, User $user, array $input): array
    {
        LabProjectAccess::assertWritable($project, $user);
        $this->workspaces->ensure($project);

        $publication = $this->forProject($project);
        $kind = $input['kind'] === LabPublication::KIND_CUSTOM
            ? LabPublication::KIND_CUSTOM
            : LabPublication::KIND_SUBDOMAIN;

        if ($kind === LabPublication::KIND_CUSTOM) {
            $this->entitlements->assertFeature($user, EntitlementCatalog::CUSTOM_DOMAIN);
            $host = $this->hosts->normalizeCustomHost((string) ($input['custom_host'] ?? ''));
            $this->hosts->assertCustomHost($host);
            $this->assertCustomHostAvailable($host, $publication);

            $hostChanged = $publication->custom_host !== $host;
            $publication->forceFill([
                'kind' => LabPublication::KIND_CUSTOM,
                'custom_host' => $host,
                'custom_host_verified_at' => $hostChanged ? null : $publication->custom_host_verified_at,
                'last_error' => null,
            ])->save();

            if (! $publication->customHostVerified()) {
                return $this->payload($project->fresh() ?? $project, $user);
            }
        } else {
            $canPick = $this->entitlements->allows($user, EntitlementCatalog::CUSTOM_SUBDOMAIN);
            if ($canPick) {
                $slug = $this->hosts->normalizeSubdomain((string) ($input['subdomain'] ?? $publication->subdomain ?? ''));
                $this->hosts->assertSubdomain($slug);
                $this->assertSubdomainAvailable($slug, $publication);
            } else {
                $slug = (string) $publication->subdomain;
                if ($slug === '') {
                    $slug = $this->uniqueRandomSubdomain();
                }
            }
            $publication->forceFill([
                'kind' => LabPublication::KIND_SUBDOMAIN,
                'subdomain' => $slug,
                'last_error' => null,
            ])->save();
        }

        $this->queueBuild($publication);

        return $this->payload($project->fresh(['publication']) ?? $project, $user);
    }

    /**
     * @return array<string, mixed>
     */
    public function verifyCustomHost(LabProject $project, User $user): array
    {
        LabProjectAccess::assertWritable($project, $user);
        $this->entitlements->assertFeature($user, EntitlementCatalog::CUSTOM_DOMAIN);

        $publication = $this->forProject($project);
        if ($publication->kind !== LabPublication::KIND_CUSTOM || blank($publication->custom_host)) {
            throw new InvalidArgumentException(__('dashboard.Add a custom domain first.'));
        }

        $host = $publication->custom_host;
        $ok = $this->dns->hasVerificationTxt($host, $publication->verify_token, $this->config)
            || $this->dns->pointsToPublishTarget($host, $this->config);

        if (! $ok) {
            throw new InvalidArgumentException(__('dashboard.DNS is not pointing here yet. Check the CNAME/A record and the TXT record, then wait a few minutes.'));
        }

        $publication->forceFill([
            'custom_host_verified_at' => now(),
            'last_error' => null,
        ])->save();

        return $this->payload($project->fresh(['publication']) ?? $project, $user);
    }

    /**
     * @return array<string, mixed>
     */
    public function unpublish(LabProject $project, User $user): array
    {
        LabProjectAccess::assertWritable($project, $user);
        $publication = $this->forProject($project);
        $publication->forceFill([
            'status' => LabPublication::STATUS_UNPUBLISHED,
            'last_error' => null,
        ])->save();

        return $this->payload($project->fresh(['publication']) ?? $project, $user);
    }

    /**
     * @return array<string, mixed>
     */
    public function deployArtifact(LabProject $project, User $user, UploadedFile $artifact): array
    {
        LabProjectAccess::assertWritable($project, $user);
        $this->workspaces->ensure($project);

        $publication = $this->forProject($project);
        if ($publication->status !== LabPublication::STATUS_BUILDING) {
            throw new InvalidArgumentException(__('dashboard.No publish build is in progress.'));
        }

        if ($publication->kind === LabPublication::KIND_CUSTOM && ! $publication->customHostVerified()) {
            throw new InvalidArgumentException(__('dashboard.Verify the custom domain before publishing.'));
        }

        $destination = storage_path('app/lab/live/'.$project->uuid);
        $zipPath = $artifact->getRealPath();
        if (! is_string($zipPath) || $zipPath === '') {
            throw new InvalidArgumentException(__('dashboard.Upload a production build archive.'));
        }

        try {
            $this->deployer->deploy($zipPath, $destination);
            $publication->forceFill([
                'status' => LabPublication::STATUS_LIVE,
                'published_at' => now(),
                'last_error' => null,
            ])->save();
        } catch (Throwable $e) {
            if (is_dir($destination) && $publication->status !== LabPublication::STATUS_LIVE) {
                File::deleteDirectory($destination);
            }
            $publication->forceFill([
                'status' => LabPublication::STATUS_FAILED,
                'last_error' => $this->publicError($e),
            ])->save();

            report($e);

            throw $e instanceof InvalidArgumentException
                ? $e
                : new RuntimeException($this->publicError($e), previous: $e);
        }

        return $this->payload($project->fresh(['publication']) ?? $project, $user);
    }

    public function findLiveByHost(string $host): ?LabPublication
    {
        return LabPublication::findLiveByHost($host, $this->config, $this->hosts);
    }

    private function queueBuild(LabPublication $publication): void
    {
        $publication->forceFill([
            'status' => LabPublication::STATUS_BUILDING,
            'last_error' => null,
        ])->save();
    }

    private function uniqueSubdomain(string $slug): string
    {
        $base = $slug;
        $n = 2;
        while (LabPublication::query()->where('subdomain', $slug)->exists()) {
            $suffix = '-'.$n;
            $slug = substr($base, 0, max(3, 48 - strlen($suffix))).$suffix;
            $n++;
            if ($n > 50) {
                $slug = $this->hosts->normalizeSubdomain(bin2hex(random_bytes(4)));
                break;
            }
        }

        return $slug;
    }

    private function uniqueRandomSubdomain(): string
    {
        for ($i = 0; $i < 24; $i++) {
            $slug = $this->hosts->randomSubdomain();
            if (! LabPublication::query()->where('subdomain', $slug)->exists()) {
                return $slug;
            }
        }

        return $this->uniqueSubdomain($this->hosts->randomSubdomain());
    }

    private function assertSubdomainAvailable(string $slug, LabPublication $current): void
    {
        $taken = LabPublication::query()
            ->where('subdomain', $slug)
            ->where('id', '!=', $current->id)
            ->exists();

        if ($taken) {
            throw new InvalidArgumentException(__('dashboard.That subdomain is already in use.'));
        }
    }

    private function assertCustomHostAvailable(string $host, LabPublication $current): void
    {
        $taken = LabPublication::query()
            ->where('custom_host', $host)
            ->where('id', '!=', $current->id)
            ->exists();

        if ($taken) {
            throw new InvalidArgumentException(__('dashboard.That domain is already connected to another Lab site.'));
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function serialize(LabPublication $publication): array
    {
        $url = null;
        if ($publication->kind === LabPublication::KIND_CUSTOM && filled($publication->custom_host)) {
            $url = $this->config->customUrl($publication->custom_host);
        } elseif (filled($publication->subdomain)) {
            $url = $this->config->subdomainUrl($publication->subdomain);
        }

        return [
            'kind' => $publication->kind,
            'subdomain' => $publication->subdomain,
            'custom_host' => $publication->custom_host,
            'status' => $publication->status,
            'url' => $url,
            'verified' => $publication->customHostVerified(),
            'needs_verification' => $publication->kind === LabPublication::KIND_CUSTOM
                && ! $publication->customHostVerified(),
            'published_at' => $publication->published_at?->toIso8601String(),
            'last_error' => $publication->last_error,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function configPayload(LabPublication $publication, User $user): array
    {
        $host = $publication->custom_host ?: 'www.example.com';

        return [
            'parent_domain' => $this->config->parentDomain(),
            'scheme' => $this->config->scheme(),
            'cname_target' => $this->config->cnameTarget(),
            'a_record' => $this->config->serverIp(),
            'txt_host' => '_krikkit-lab',
            'txt_name' => $this->config->txtName($host),
            'txt_value' => $this->config->txtValue($publication->verify_token),
            'custom_subdomain_allowed' => $this->entitlements->allows($user, EntitlementCatalog::CUSTOM_SUBDOMAIN),
            'custom_domain_allowed' => $this->entitlements->allows($user, EntitlementCatalog::CUSTOM_DOMAIN),
            'upgrade_url' => route('dashboard.packs.index'),
            'enabled' => $this->config->enabled(),
            'artifact_max_bytes' => max(1, (int) config('lab.publish.artifact_max_bytes', 50 * 1024 * 1024)),
        ];
    }

    private function publicError(Throwable $e): string
    {
        if ($e instanceof RuntimeException || $e instanceof InvalidArgumentException) {
            $message = $e->getMessage();

            return strlen($message) > 2000 ? substr($message, 0, 2000) : $message;
        }

        return __('dashboard.The site could not be built. Check the project, then try again.');
    }
}
