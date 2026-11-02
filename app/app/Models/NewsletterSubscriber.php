<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

#[Fillable(['public_id', 'email', 'ip', 'confirmed_at'])]
class NewsletterSubscriber extends Model
{
    protected static function booted(): void
    {
        static::creating(function (NewsletterSubscriber $row): void {
            if (blank($row->public_id)) {
                $row->public_id = (string) Str::ulid();
            }
        });
    }

    public function getRouteKeyName(): string
    {
        return 'public_id';
    }

    protected function casts(): array
    {
        return [
            'confirmed_at' => 'datetime',
        ];
    }
}
