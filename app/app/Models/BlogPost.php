<?php

namespace App\Models;

use App\Support\Html\SafeHtml;
use Database\Factories\BlogPostFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

#[Fillable([
    'slug',
    'title',
    'excerpt',
    'body',
    'published',
    'published_on',
    'author_id',
])]
class BlogPost extends Model
{
    /** @use HasFactory<BlogPostFactory> */
    use HasFactory;

    protected static function booted(): void
    {
        static::creating(function (BlogPost $post): void {
            if (blank($post->public_id)) {
                $post->public_id = (string) Str::ulid();
            }
        });
    }

    public function getRouteKeyName(): string
    {
        return 'public_id';
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }

    /**
     * @param  Builder<BlogPost>  $query
     * @return Builder<BlogPost>
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
