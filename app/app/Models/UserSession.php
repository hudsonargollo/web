<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

class UserSession extends Model
{
    protected $table = 'sessions';

    protected $primaryKey = 'id';

    public $incrementing = false;

    protected $keyType = 'string';

    public $timestamps = false;

    protected $guarded = [];

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function lastActivityAt(): Carbon
    {
        return Carbon::createFromTimestamp((int) $this->last_activity);
    }

    public function isCurrent(): bool
    {
        return $this->id === session()->getId();
    }

    public function scopeActive($query)
    {
        $lifetimeSeconds = (int) config('session.lifetime', 120) * 60;
        $cutoff = now()->subSeconds($lifetimeSeconds)->getTimestamp();

        return $query->where('last_activity', '>=', $cutoff);
    }

    public function scopeAuthenticated($query)
    {
        return $query->whereNotNull('user_id');
    }
}
