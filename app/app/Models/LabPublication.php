<?php

namespace App\Models;

use App\Lab\Publish\LabPublishConfig;
use App\Lab\Publish\PublishHost;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

#[Fillable([
    'lab_project_id',
    'public_id',
    'kind',
    'subdomain',
    'custom_host',
    'status',
    'verify_token',
    'custom_host_verified_at',
    'published_at',
    'last_error',
])]
class LabPublication extends Model
{
    public const KIND_SUBDOMAIN = 'subdomain';

    public const KIND_CUSTOM = 'custom';

    public const STATUS_IDLE = 'idle';

    public const STATUS_BUILDING = 'building';

    public const STATUS_LIVE = 'live';

    public const STATUS_FAILED = 'failed';

    public const STATUS_UNPUBLISHED = 'unpublished';

    protected static function booted(): void
    {
        static::creating(function (LabPublication $publication): void {
            if (blank($publication->public_id)) {
                $publication->public_id = (string) Str::ulid();
            }
            if (blank($publication->verify_token)) {
                $publication->verify_token = bin2hex(random_bytes(16));
            }
        });
    }

    public function getRouteKeyName(): string
    {
        return 'public_id';
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(LabProject::class, 'lab_project_id');
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'custom_host_verified_at' => 'datetime',
            'published_at' => 'datetime',
        ];
    }

    public function isLive(): bool
    {
        return $this->status === self::STATUS_LIVE;
    }

    public function isBuilding(): bool
    {
        return $this->status === self::STATUS_BUILDING;
    }

    public function customHostVerified(): bool
    {
        return $this->custom_host_verified_at !== null && filled($this->custom_host);
    }

    public function liveRoot(): string
    {
        $uuid = $this->project?->uuid ?? LabProject::query()->whereKey($this->lab_project_id)->value('uuid');

        return storage_path('app/lab/live/'.$uuid);
    }

    public static function findLiveByHost(string $host, LabPublishConfig $config, PublishHost $hosts): ?self
    {
        $host = $config->punycode(strtolower(rtrim(trim($host), '.')));
        if ($host === '' || $host === $config->appHost()) {
            return null;
        }

        $slug = $hosts->subdomainFromRequestHost($host);
        if (is_string($slug) && $slug !== '') {
            return self::query()
                ->with('project')
                ->where('status', self::STATUS_LIVE)
                ->where('kind', self::KIND_SUBDOMAIN)
                ->where('subdomain', $slug)
                ->first();
        }

        return self::query()
            ->with('project')
            ->where('status', self::STATUS_LIVE)
            ->where('kind', self::KIND_CUSTOM)
            ->where('custom_host', $host)
            ->whereNotNull('custom_host_verified_at')
            ->first();
    }
}
