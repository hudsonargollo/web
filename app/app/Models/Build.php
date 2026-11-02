<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

final class Build extends Model
{
    public const STATUS_QUEUED = 'queued';

    public const STATUS_PLANNING = 'planning';

    public const STATUS_BUILDING = 'building';

    public const STATUS_READY = 'ready';

    public const STATUS_PUBLISHING = 'publishing';

    public const STATUS_LIVE = 'live';

    public const STATUS_FAILED = 'failed';

    public const KIND_SITE = 'site';

    public const KIND_PROPOSAL = 'proposal';

    protected $fillable = [
        'id', 'kind', 'title', 'brief', 'model', 'status', 'stage', 'lab_project_id',
        'subdomain', 'live_url', 'idempotency_key', 'turns', 'tool_turns', 'files',
        'tokens_in', 'tokens_out', 'error', 'started_at', 'finished_at',
    ];

    protected $keyType = 'string';

    public $incrementing = false;

    protected function casts(): array
    {
        return [
            'brief' => 'array',
            'turns' => 'integer',
            'tool_turns' => 'integer',
            'files' => 'integer',
            'tokens_in' => 'integer',
            'tokens_out' => 'integer',
            'started_at' => 'datetime',
            'finished_at' => 'datetime',
        ];
    }

    public static function newId(): string
    {
        return 'bld_'.Str::ulid()->toBase32();
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(LabProject::class, 'lab_project_id');
    }

    public function isTerminal(): bool
    {
        return in_array($this->status, [self::STATUS_READY, self::STATUS_LIVE, self::STATUS_FAILED], true);
    }

    /**
     * @return array<string, mixed>
     */
    public function toApiArray(): array
    {
        return [
            'id' => $this->id,
            'kind' => $this->kind,
            'status' => $this->status,
            'stage' => $this->stage,
            'turns' => $this->turns,
            'files' => $this->files,
            'preview_url' => null,
            'live_url' => $this->live_url,
            'error' => $this->error,
        ];
    }
}
