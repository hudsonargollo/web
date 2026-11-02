<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AiWorkspaceSetting extends Model
{
    protected $fillable = [
        'default_model',
    ];

    public static function current(): self
    {
        return static::query()->firstOrCreate([]);
    }
}
