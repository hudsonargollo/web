<?php

namespace App\Models;

use App\Support\Html\SafeHtml;
use Database\Factories\SitePageFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

#[Fillable([
    'slug',
    'title',
    'body',
    'published',
    'published_on',
])]
class SitePage extends Model
{
    /** @use HasFactory<SitePageFactory> */
    use HasFactory;

    /**
     * @var list<string>
     */
    public const BLOCKED_SLUGS = [
        'blog', 'dashboard', 'lab', 'login', 'register', 'logout',
        'privacy', 'terms', 'pages', 'password', 'verify-email',
        'forgot-password', 'reset-password', 'two-factor-challenge',
        'confirm-password', 'webhooks', 'kit',
    ];

    protected static function booted(): void
    {
        static::creating(function (SitePage $page): void {
            if (blank($page->public_id)) {
                $page->public_id = (string) Str::ulid();
            }
        });
    }

    public function getRouteKeyName(): string
    {
        return 'public_id';
    }

    /**
     * @param  Builder<SitePage>  $query
     * @return Builder<SitePage>
     */
    public function scopeReleased(Builder $query): Builder
    {
        return $query->where('published', true);
    }

    public function isReleased(): bool
    {
        return $this->published && SafeHtml::hasCopy((string) $this->body);
    }

    protected function casts(): array
    {
        return [
            'published' => 'boolean',
            'published_on' => 'date',
        ];
    }
}
