<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'lab_project_id',
    'driver',
    'owner',
    'repo',
    'branch',
    'root_directory',
    'html_url',
    'forked_from',
    'last_pushed_sha',
    'last_pulled_sha',
    'last_synced_at',
])]
class LabProjectRemote extends Model
{
    public const DRIVER_GITHUB = 'github';

    protected function casts(): array
    {
        return [
            'last_synced_at' => 'datetime',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(LabProject::class, 'lab_project_id');
    }

    public function fullName(): string
    {
        return $this->owner.'/'.$this->repo;
    }

    /**
     * @return array<string, mixed>
     */
    public function toLabPayload(): array
    {
        return [
            'driver' => $this->driver,
            'owner' => $this->owner,
            'repo' => $this->repo,
            'branch' => $this->branch,
            'root_directory' => $this->root_directory,
            'html_url' => $this->html_url ?: 'https://github.com/'.$this->fullName(),
            'forked_from' => $this->forked_from,
            'full_name' => $this->fullName(),
            'last_pushed_sha' => $this->last_pushed_sha,
            'last_pulled_sha' => $this->last_pulled_sha,
            'last_synced_at' => $this->last_synced_at?->toIso8601String(),
        ];
    }
}
