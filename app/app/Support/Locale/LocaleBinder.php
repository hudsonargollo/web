<?php

namespace App\Support\Locale;

use App\Models\Language;
use App\Support\Site\SiteSettings;
use Illuminate\Support\Facades\Lang;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\View;

final class LocaleBinder
{
    public function __construct(
        private readonly SiteSettings $site,
        private readonly PhraseLedger $ledger,
    ) {}

    public function apply(): void
    {
        $language = $this->resolve();
        $code = $language?->code ?? $this->site->locale();
        $code = $code !== '' ? $code : (string) config('app.locale', 'en');

        app()->setLocale($code);
        View::share('documentDir', $language?->direction === 'rtl' ? 'rtl' : 'ltr');

        if ($language !== null) {
            $this->hydrate($language);
        }
    }

    public function hydrate(Language $language): void
    {
        if (! $this->ready()) {
            return;
        }

        foreach (app(PhraseCatalog::class)->groups() as $group) {
            $lines = $this->ledger->values($language, $group);

            if ($lines === []) {
                continue;
            }

            $prefixed = [];

            foreach ($lines as $key => $value) {
                $prefixed[$group.'.'.$key] = $value;
            }

            Lang::addLines($prefixed, $language->code);
        }
    }

    public function resolve(): ?Language
    {
        if (! $this->ready()) {
            return null;
        }

        $preferred = Language::normalizeCode($this->site->locale());

        $language = Language::query()
            ->enabled()
            ->where('code', $preferred)
            ->first();

        if ($language !== null) {
            return $language;
        }

        return Language::query()
            ->enabled()
            ->where('is_default', true)
            ->first();
    }

    private function ready(): bool
    {
        try {
            return Schema::hasTable('languages') && Schema::hasTable('language_lines');
        } catch (\Throwable) {
            return false;
        }
    }
}
