<?php

namespace App\Livewire\Dashboard\Integration\Options;

use App\Ai\Cost\CostEstimator;
use App\Ai\Data\ModelDefinition;
use App\Ai\ModelCatalog;
use App\Ai\Settings\AiSettingsRepository;
use App\Datastore\DatastoreKind;
use App\Datastore\SupabaseLinkBroker;
use App\Integrations\Github\GithubLinkBroker;
use App\Integrations\WorkspaceOauthAppStore;
use App\Lab\Github\LabGithubImportLimits;
use App\Models\WorkspaceOauthApp;
use App\Support\Ui\Pulse;
use App\Visuals\VisualCatalog;
use App\Visuals\VisualCredentialStore;
use Illuminate\Contracts\View\View;
use Illuminate\Support\Facades\Gate;
use Livewire\Attributes\Layout;
use Livewire\Attributes\Lazy;
use Livewire\Component;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

#[Lazy]
#[Layout('components.layouts.dashboard', ['skeleton' => 'form'])]
class EditComponent extends Component
{
    public function placeholder(): View
    {
        return view('components.dashboard.livewirePlaceholder', ['variant' => 'form'])
            ->layoutData($this->layoutData());
    }

    public function layoutData(): array
    {
        return [
            'title' => __('dashboard.API Integration'),
        ];
    }

    public string $provider = '';

    public string $apiKey = '';

    public string $applicationId = '';

    public string $apiSecret = '';

    public bool $enabled = true;

    public bool $clearKey = false;

    public string $clientId = '';

    public string $clientSecret = '';

    public bool $clearSecret = false;

    public int $maxZipMb = LabGithubImportLimits::MAX_ZIP_MB_DEFAULT;

    public int $maxFiles = LabGithubImportLimits::MAX_FILES_DEFAULT;

    public string $modelId = '';

    public string $defaultModelId = '';

    public string $scenarioId = 'marketing_site';

    public int $projectCount = 10;

    public string $redirectUri = '';

    public function mount(string $provider): void
    {
        Gate::authorize('ai.revise');

        if (! $this->isKnownProvider($provider)) {
            throw new NotFoundHttpException(__('dashboard.Unknown AI provider.'));
        }

        $this->provider = $provider;

        if ($this->isGithub()) {
            $row = WorkspaceOauthApp::query()
                ->where('driver', WorkspaceOauthAppStore::DRIVER_GITHUB)
                ->first();
            $this->clientId = $row && filled($row->client_id) ? (string) $row->client_id : '';
            $this->clientSecret = '';
            $this->clearSecret = false;
            $this->enabled = $row ? (bool) $row->enabled : true;
            $this->maxZipMb = LabGithubImportLimits::maxZipMb();
            $this->maxFiles = LabGithubImportLimits::maxFiles();

            return;
        }

        if ($this->isVisualCatalog()) {
            $visualKeys = app(VisualCredentialStore::class);
            $this->enabled = $visualKeys->isEnabled($provider);
            $this->applicationId = $this->isUnsplash() ? $visualKeys->applicationId($provider) : '';
            $this->apiKey = '';
            $this->apiSecret = '';
            $this->clearKey = false;
            $this->clearSecret = false;

            return;
        }

        if ($this->isDatastore()) {
            $row = WorkspaceOauthApp::query()
                ->where('driver', WorkspaceOauthAppStore::DRIVER_SUPABASE)
                ->first();
            $this->clientId = $row && filled($row->client_id) ? (string) $row->client_id : '';
            $this->clientSecret = '';
            $this->clearSecret = false;
            $this->enabled = $row ? (bool) $row->enabled : true;
            $settings = is_array($row?->settings) ? $row->settings : [];
            $this->redirectUri = trim((string) ($settings['redirect_uri'] ?? ''));

            return;
        }

        $settings = app(AiSettingsRepository::class);
        $catalog = app(ModelCatalog::class);
        $estimator = app(CostEstimator::class);

        $this->enabled = $settings->isEnabled($provider);
        $this->apiKey = '';
        $this->clearKey = false;

        $models = $this->providerModels($catalog);
        $this->defaultModelId = $catalog->defaultId();
        $default = $this->defaultModelId;
        $this->modelId = collect($models)->firstWhere('id', $default)?->id
            ?? ($models[0]->id ?? '');

        $scenarios = $estimator->scenarios();
        $this->scenarioId = collect($scenarios)->firstWhere('id', $this->scenarioId)['id']
            ?? ($scenarios[0]['id'] ?? 'landing_draft');

        $this->projectCount = 10;
    }

    public function setAsDefault(string $modelId, ModelCatalog $catalog, AiSettingsRepository $settings): void
    {
        Gate::authorize('ai.revise');

        if ($this->isGithub() || $this->isVisualCatalog() || $this->isDatastore()) {
            return;
        }

        $models = $this->providerModels($catalog);
        if (! collect($models)->contains(fn ($model) => $model->id === $modelId)) {
            return;
        }

        if ($this->defaultModelId === $modelId) {
            return;
        }

        $settings->setDefaultModelId($modelId);
        $this->defaultModelId = $catalog->defaultId();
        $this->pulseOk(__('dashboard.Default model saved.'));
    }

    public function updatedModelId(ModelCatalog $catalog): void
    {
        if ($this->isGithub() || $this->isVisualCatalog() || $this->isDatastore()) {
            return;
        }

        $models = $this->providerModels($catalog);
        if ($this->modelId !== '' && ! collect($models)->contains(fn ($m) => $m->id === $this->modelId)) {
            $this->modelId = $models[0]->id ?? '';
        }
    }

    public function updatedScenarioId(CostEstimator $estimator): void
    {
        if ($this->isGithub() || $this->isVisualCatalog() || $this->isDatastore()) {
            return;
        }

        $scenarios = $estimator->scenarios();
        if (! collect($scenarios)->contains(fn (array $s) => $s['id'] === $this->scenarioId)) {
            $this->scenarioId = $scenarios[0]['id'] ?? 'landing_draft';
        }
    }

    public function updatedProjectCount(): void
    {
        $this->projectCount = max(
            CostEstimator::PROJECT_COUNT_MIN,
            min(CostEstimator::PROJECT_COUNT_MAX, $this->projectCount)
        );
    }

    public function save(AiSettingsRepository $settings, WorkspaceOauthAppStore $apps): void
    {
        Gate::authorize('ai.revise');

        if ($this->isDatastore()) {
            $this->validate([
                'redirectUri' => $this->redirectUri === ''
                    ? ['nullable', 'string', 'max:512']
                    : ['required', 'string', 'max:512', 'url', 'starts_with:https://'],
            ], [
                'redirectUri.starts_with' => __('dashboard.Supabase requires an HTTPS callback URL. Set the redirect override to your tunnel URL.'),
            ]);

            $apps->save(WorkspaceOauthAppStore::DRIVER_SUPABASE, [
                'client_id' => $this->clientId !== '' ? $this->clientId : null,
                'client_secret' => $this->clientSecret !== '' ? $this->clientSecret : null,
                'enabled' => $this->enabled,
                'clear_secret' => $this->clearSecret,
                'settings' => $apps->normalizeSupabaseSettings([
                    'redirect_uri' => $this->redirectUri,
                ]),
            ]);

            $this->clientSecret = '';
            $this->clearSecret = false;
            $row = WorkspaceOauthApp::query()
                ->where('driver', WorkspaceOauthAppStore::DRIVER_SUPABASE)
                ->first();
            $this->clientId = $row && filled($row->client_id) ? (string) $row->client_id : '';
            $this->enabled = $row ? (bool) $row->enabled : true;
            $settings = is_array($row?->settings) ? $row->settings : [];
            $this->redirectUri = trim((string) ($settings['redirect_uri'] ?? ''));

            $this->pulseSaved();

            return;
        }

        if ($this->isVisualCatalog()) {
            $visualKeys = app(VisualCredentialStore::class);
            $visualKeys->save($this->provider, [
                'application_id' => $this->isUnsplash() ? ($this->applicationId !== '' ? $this->applicationId : null) : null,
                'api_key' => $this->apiKey !== '' ? $this->apiKey : null,
                'api_secret' => $this->isUnsplash() ? ($this->apiSecret !== '' ? $this->apiSecret : null) : null,
                'enabled' => $this->enabled,
                'clear' => $this->clearKey,
                'clear_secret' => $this->isUnsplash() && $this->clearSecret,
            ]);

            $this->apiKey = '';
            $this->apiSecret = '';
            $this->clearKey = false;
            $this->clearSecret = false;
            $this->enabled = $visualKeys->isEnabled($this->provider);
            $this->applicationId = $this->isUnsplash() ? $visualKeys->applicationId($this->provider) : '';
            $this->pulseSaved();

            return;
        }

        if ($this->isGithub()) {
            $this->maxZipMb = LabGithubImportLimits::clampMb($this->maxZipMb);
            $this->maxFiles = LabGithubImportLimits::clampFiles($this->maxFiles);

            $apps->save(WorkspaceOauthAppStore::DRIVER_GITHUB, [
                'client_id' => $this->clientId !== '' ? $this->clientId : null,
                'client_secret' => $this->clientSecret !== '' ? $this->clientSecret : null,
                'enabled' => $this->enabled,
                'clear_secret' => $this->clearSecret,
                'settings' => $apps->normalizeGithubSettings([
                    'max_zip_mb' => $this->maxZipMb,
                    'max_files' => $this->maxFiles,
                ]),
            ]);

            $this->clientSecret = '';
            $this->clearSecret = false;
            $row = WorkspaceOauthApp::query()
                ->where('driver', WorkspaceOauthAppStore::DRIVER_GITHUB)
                ->first();
            $this->clientId = $row && filled($row->client_id) ? (string) $row->client_id : '';
            $this->enabled = $row ? (bool) $row->enabled : true;
            $this->maxZipMb = LabGithubImportLimits::maxZipMb();
            $this->maxFiles = LabGithubImportLimits::maxFiles();

            $this->pulseSaved();

            return;
        }

        $settings->saveProviderCredentials([
            $this->provider => [
                'api_key' => $this->apiKey !== '' ? $this->apiKey : null,
                'enabled' => $this->enabled,
                'clear' => $this->clearKey,
            ],
        ]);

        $this->apiKey = '';
        $this->clearKey = false;
        $this->enabled = $settings->isEnabled($this->provider);

        $this->pulseSaved();
    }

    public function render(ModelCatalog $catalog, AiSettingsRepository $settings, CostEstimator $estimator, WorkspaceOauthAppStore $apps, GithubLinkBroker $broker, SupabaseLinkBroker $supabaseBroker, VisualCredentialStore $visualKeys): View
    {
        $sidecar = $this->isGithub() || $this->isVisualCatalog() || $this->isDatastore();
        $models = $sidecar ? [] : $this->providerModels($catalog);
        if (! $sidecar) {
            $this->defaultModelId = $catalog->defaultId();
        }
        $scenarios = $sidecar ? [] : $estimator->scenarios();

        $project = (! $sidecar && $this->modelId !== '' && $catalog->has($this->modelId) && $scenarios !== [])
            ? $estimator->estimateProject($this->modelId, $this->scenarioId, $this->projectCount)
            : null;

        $githubApp = $this->isGithub() ? $apps->get(WorkspaceOauthAppStore::DRIVER_GITHUB) : null;
        $supabaseApp = $this->isDatastore() ? $apps->get(WorkspaceOauthAppStore::DRIVER_SUPABASE) : null;

        return view('livewire.dashboard.integration.options.edit', [
            'provider' => $this->provider,
            'providerConfig' => $this->isGithub() || $this->isVisualCatalog() || $this->isDatastore()
                ? ['label' => $this->providerLabel()]
                : config("ai.providers.{$this->provider}", []),
            'providerLabel' => $this->providerLabel(),
            'isGithub' => $this->isGithub(),
            'isVisualCatalog' => $this->isVisualCatalog(),
            'isUnsplash' => $this->isUnsplash(),
            'isDatastore' => $this->isDatastore(),
            'visualKeyHint' => $this->visualKeyHint(),
            'visualHasStoredSecret' => $this->isUnsplash() ? $visualKeys->hasStoredSecret($this->provider) : false,
            'visualMaskedSecret' => $this->isUnsplash() ? $visualKeys->maskedSecret($this->provider) : null,
            'models' => $models,
            'defaultModelId' => $this->defaultModelId,
            'workspaceDefault' => $sidecar ? null : ($catalog->has($this->defaultModelId) ? $catalog->get($this->defaultModelId) : null),
            'scenarios' => $scenarios,
            'settings' => $settings,
            'project' => $project,
            'projectCountMin' => CostEstimator::PROJECT_COUNT_MIN,
            'projectCountMax' => CostEstimator::PROJECT_COUNT_MAX,
            'githubApp' => $githubApp,
            'githubCallbackUrl' => $this->isGithub() ? $broker->callbackUrl() : null,
            'githubMaskedSecret' => $this->isGithub() ? $apps->maskedSecret(WorkspaceOauthAppStore::DRIVER_GITHUB) : null,
            'githubHasStoredSecret' => $this->isGithub() ? $apps->hasStoredSecret(WorkspaceOauthAppStore::DRIVER_GITHUB) : false,
            'supabaseApp' => $supabaseApp,
            'supabaseCallbackUrl' => $this->isDatastore() ? $supabaseBroker->callbackUrl() : null,
            'supabaseMaskedSecret' => $this->isDatastore() ? $apps->maskedSecret(WorkspaceOauthAppStore::DRIVER_SUPABASE) : null,
            'supabaseHasStoredSecret' => $this->isDatastore() ? $apps->hasStoredSecret(WorkspaceOauthAppStore::DRIVER_SUPABASE) : false,
            'visualMaskedKey' => $this->isVisualCatalog() ? $visualKeys->maskedKey($this->provider) : null,
            'visualKeySource' => $this->isVisualCatalog() ? $visualKeys->keySource($this->provider) : null,
            'unreadableStoredKey' => $this->unreadableStoredKey($settings, $apps, $visualKeys),
            'maxZipMbMin' => LabGithubImportLimits::MAX_ZIP_MB_MIN,
            'maxZipMbMax' => LabGithubImportLimits::MAX_ZIP_MB_MAX,
            'maxFilesMin' => LabGithubImportLimits::MAX_FILES_MIN,
            'maxFilesMax' => LabGithubImportLimits::MAX_FILES_MAX,
        ])->layoutData($this->layoutData());
    }

    /**
     * @return list<ModelDefinition>
     */
    private function providerModels(ModelCatalog $catalog): array
    {
        return array_values(array_filter(
            $catalog->all(),
            fn ($model) => $model->provider === $this->provider
        ));
    }

    private function providerLabel(): string
    {
        if ($this->isGithub()) {
            return (string) __('dashboard.GitHub');
        }

        if ($this->isVisualCatalog()) {
            return app(VisualCatalog::class)->label($this->provider);
        }

        if ($this->isDatastore()) {
            return app(DatastoreKind::class)->label($this->provider);
        }

        return (string) (config("ai.providers.{$this->provider}.label") ?? $this->provider);
    }

    private function visualKeyHint(): ?string
    {
        return match ($this->provider) {
            'unsplash' => (string) __('dashboard.Unsplash Access Key (Client-ID). Lab uses this to search photographs on the server.'),
            'pixabay' => (string) __('dashboard.Pixabay API key. Lab looks up photographs on the server — visitors never see this key.'),
            default => null,
        };
    }

    private function unreadableStoredKey(AiSettingsRepository $settings, WorkspaceOauthAppStore $apps, VisualCredentialStore $visualKeys): bool
    {
        if ($this->isGithub()) {
            return $apps->hasUnreadableStoredSecret(WorkspaceOauthAppStore::DRIVER_GITHUB);
        }

        if ($this->isDatastore()) {
            return $apps->hasUnreadableStoredSecret(WorkspaceOauthAppStore::DRIVER_SUPABASE);
        }

        if ($this->isVisualCatalog()) {
            return $visualKeys->hasUnreadableStoredKey($this->provider);
        }

        return $settings->hasUnreadableStoredKey($this->provider);
    }

    private function isGithub(): bool
    {
        return $this->provider === WorkspaceOauthAppStore::DRIVER_GITHUB;
    }

    private function isVisualCatalog(): bool
    {
        return app(VisualCatalog::class)->has($this->provider);
    }

    private function isUnsplash(): bool
    {
        return $this->provider === 'unsplash';
    }

    private function isDatastore(): bool
    {
        return app(DatastoreKind::class)->has($this->provider);
    }

    private function isKnownProvider(string $provider): bool
    {
        if ($provider === WorkspaceOauthAppStore::DRIVER_GITHUB) {
            return true;
        }

        if (app(VisualCatalog::class)->has($provider)) {
            return true;
        }

        if (app(DatastoreKind::class)->has($provider)) {
            return true;
        }

        return array_key_exists($provider, config('ai.providers', []));
    }

    private function pulseOk(string $copy): void
    {
        $packet = Pulse::craft($copy, __('dashboard.Saved'), 'ok');
        $this->js(
            'window.dispatchEvent(new CustomEvent('.json_encode(Pulse::EVENT).', { detail: '.json_encode($packet).' }))'
        );
    }

    private function pulseSaved(): void
    {
        $packet = Pulse::craft(
            __('dashboard.:provider saved.', ['provider' => $this->providerLabel()]),
            __('dashboard.Saved'),
            'ok',
        );
        $this->js(
            'window.dispatchEvent(new CustomEvent('.json_encode(Pulse::EVENT).', { detail: '.json_encode($packet).' }))'
        );
    }
}
