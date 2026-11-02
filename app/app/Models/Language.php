<?php

namespace App\Models;

use App\Support\Site\SiteSettings;
use Database\Factories\LanguageFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

#[Fillable([
    'code',
    'name',
    'native_name',
    'direction',
    'enabled',
    'is_default',
])]
class Language extends Model
{
    /** @use HasFactory<LanguageFactory> */
    use HasFactory;

    protected static function booted(): void
    {
        static::creating(function (Language $language): void {
            if (blank($language->public_id)) {
                $language->public_id = (string) Str::ulid();
            }
        });

        static::saving(function (Language $language): void {
            $language->code = self::normalizeCode((string) $language->code);

            if ($language->is_default) {
                $language->enabled = true;
            }
        });

        static::saved(function (Language $language): void {
            if (! $language->is_default) {
                return;
            }

            static::query()
                ->whereKeyNot($language->id)
                ->where('is_default', true)
                ->update(['is_default' => false]);
        });
    }

    public function getRouteKeyName(): string
    {
        return 'public_id';
    }

    /**
     * @return HasMany<LanguageLine, $this>
     */
    public function lines(): HasMany
    {
        return $this->hasMany(LanguageLine::class);
    }

    public function label(): string
    {
        $native = trim((string) $this->native_name);

        return $native !== '' ? $native : $this->name;
    }

    /**
     * @param  Builder<Language>  $query
     * @return Builder<Language>
     */
    public function scopeEnabled(Builder $query): Builder
    {
        return $query->where('enabled', true);
    }

    /**
     * @return array<string, string>
     */
    public static function options(): array
    {
        if (! self::tablesReady()) {
            return ['en' => 'English'];
        }

        $options = static::query()
            ->enabled()
            ->orderBy('name')
            ->get()
            ->mapWithKeys(fn (self $language): array => [$language->code => $language->name])
            ->all();

        if ($options === []) {
            $options = ['en' => 'English'];
        }

        try {
            $current = app(SiteSettings::class)->locale();
            if ($current !== '' && ! isset($options[$current])) {
                $options[$current] = $current;
            }
        } catch (\Throwable) {
        }

        return $options;
    }

    public static function defaultCode(): string
    {
        if (! self::tablesReady()) {
            return 'en';
        }

        $code = static::query()->where('is_default', true)->value('code');

        return is_string($code) && $code !== '' ? $code : 'en';
    }

    public static function normalizeCode(string $code): string
    {
        $code = strtolower(str_replace('_', '-', trim($code)));

        return $code;
    }

    protected function casts(): array
    {
        return [
            'enabled' => 'boolean',
            'is_default' => 'boolean',
        ];
    }

    private static function tablesReady(): bool
    {
        try {
            return Schema::hasTable('languages');
        } catch (\Throwable) {
            return false;
        }
    }
}
