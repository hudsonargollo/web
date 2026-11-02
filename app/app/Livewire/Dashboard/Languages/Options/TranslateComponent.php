<?php

namespace App\Livewire\Dashboard\Languages\Options;

use App\Ai\Exceptions\AiException;
use App\Ai\ModelCatalog;
use App\Models\Language;
use App\Support\Locale\LocaleBinder;
use App\Support\Locale\PhraseCatalog;
use App\Support\Locale\PhraseLedger;
use App\Support\Locale\PhraseTranslator;
use App\Support\Ui\Pulse;
use Illuminate\Contracts\View\View;
use Illuminate\Support\Facades\Gate;
use Livewire\Attributes\Layout;
use Livewire\Component;

#[Layout('components.layouts.dashboard', ['skeleton' => 'form'])]
class TranslateComponent extends Component
{
    public const PER_PAGE = 20;

    public Language $language;

    public string $group = '';

    public string $search = '';

    public int $page = 1;

    /**
     * @var array<string, string>
     */
    public array $stash = [];

    /**
     * @var list<array{key: string, source: string, value: string}>
     */
    public array $rows = [];

    /**
     * @return array{title: string, breadcrumbs: list<array{label: string, href?: string, current?: bool}>}
     */
    public function layoutData(): array
    {
        $label = isset($this->language) ? $this->language->name : __('dashboard.Language');

        return [
            'title' => __('dashboard.Translate').' '.$label,
            'breadcrumbs' => [
                ['label' => __('dashboard.Languages'), 'href' => route('dashboard.languages.index')],
                ['label' => __('dashboard.Translate'), 'current' => true],
            ],
        ];
    }

    public function mount(Language $language, PhraseCatalog $catalog): void
    {
        Gate::authorize('languages.revise');
        $this->language = $language;
        $this->group = $catalog->groups()[0] ?? 'dashboard';
        $this->reloadRows();
    }

    public function updatedSearch(): void
    {
        $this->flushRows();
        $this->page = 1;
        $this->reloadRows();
    }

    public function selectGroup(string $group): void
    {
        $this->flushRows();
        $this->group = $group;
        $this->page = 1;
        $this->reloadRows();
    }

    public function gotoPage(int $page): void
    {
        $this->flushRows();
        $this->page = max(1, $page);
        $this->reloadRows();
    }

    public function save(PhraseLedger $ledger, LocaleBinder $binder): void
    {
        Gate::authorize('languages.revise');
        $this->flushRows();

        $byGroup = [];

        foreach ($this->stash as $token => $value) {
            $parts = explode("\x1f", $token, 2);

            if (count($parts) !== 2) {
                continue;
            }

            [$group, $key] = $parts;
            $byGroup[$group][$key] = (string) $value;
        }

        foreach ($byGroup as $group => $values) {
            $ledger->putMany($this->language, $group, $values);
        }

        $binder->hydrate($this->language->fresh() ?? $this->language);
        $this->reloadRows();
        $this->pulseOk(__('dashboard.Translations saved.'));
    }

    public function translatePage(PhraseTranslator $translator): void
    {
        Gate::authorize('languages.revise');

        $phrases = [];

        foreach ($this->rows as $row) {
            $phrases[$row['key']] = $row['source'];
        }

        if ($phrases === []) {
            $this->pulseFail(__('dashboard.Nothing on this page to translate.'));

            return;
        }

        try {
            $translated = $translator->translate($this->language, $phrases);
        } catch (AiException $exception) {
            $this->pulseFail($exception->getMessage());

            return;
        }

        foreach ($this->rows as $index => $row) {
            if (! array_key_exists($row['key'], $translated)) {
                continue;
            }

            $this->rows[$index]['value'] = $translated[$row['key']];
        }

        $this->flushRows();
        $this->pulseOk(__('dashboard.This page was translated. Review and save.'));
    }

    public function render(PhraseCatalog $catalog, PhraseLedger $ledger, ModelCatalog $models): View
    {
        $groups = $catalog->groups();
        $matched = $this->matchedEntries($catalog, $ledger);
        $total = count($matched);
        $lastPage = max(1, (int) ceil($total / self::PER_PAGE));

        if ($this->page > $lastPage) {
            $this->page = $lastPage;
            $this->reloadRows();
        }

        $modelId = $models->defaultId();
        $model = $modelId !== '' && $models->has($modelId) ? $models->get($modelId) : null;

        return view('livewire.dashboard.languages.options.translate', [
            'groups' => $groups,
            'total' => $total,
            'lastPage' => $lastPage,
            'firstItem' => $total === 0 ? 0 : (($this->page - 1) * self::PER_PAGE) + 1,
            'lastItem' => min($this->page * self::PER_PAGE, $total),
            'modelLabel' => $model?->label,
        ])->layoutData($this->layoutData());
    }

    /**
     * @return list<array{key: string, source: string, value: string}>
     */
    private function matchedEntries(PhraseCatalog $catalog, PhraseLedger $ledger): array
    {
        $stored = $ledger->values($this->language, $this->group);
        $term = mb_strtolower(trim($this->search));
        $matched = [];

        foreach ($catalog->entries($this->group) as $entry) {
            $value = $this->resolvedValue($entry['key'], $entry['source'], $stored);

            if ($term !== '' && ! $this->matches($term, $entry['key'], $entry['source'], $value)) {
                continue;
            }

            $matched[] = [
                'key' => $entry['key'],
                'source' => $entry['source'],
                'value' => $value,
            ];
        }

        return $matched;
    }

    private function reloadRows(): void
    {
        $catalog = app(PhraseCatalog::class);
        $ledger = app(PhraseLedger::class);
        $matched = $this->matchedEntries($catalog, $ledger);
        $total = count($matched);
        $lastPage = max(1, (int) ceil($total / self::PER_PAGE));
        $this->page = min(max(1, $this->page), $lastPage);
        $this->rows = array_values(array_slice($matched, ($this->page - 1) * self::PER_PAGE, self::PER_PAGE));
    }

    private function flushRows(): void
    {
        foreach ($this->rows as $row) {
            $this->stash[$this->token($this->group, $row['key'])] = (string) ($row['value'] ?? '');
        }
    }

    private function token(string $group, string $key): string
    {
        return $group."\x1f".$key;
    }

    private function matches(string $term, string $key, string $source, string $value): bool
    {
        foreach ([$key, $source, $value] as $haystack) {
            if (str_contains(mb_strtolower($haystack), $term)) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param  array<string, string>  $stored
     */
    private function resolvedValue(string $key, string $source, array $stored): string
    {
        $token = $this->token($this->group, $key);
        $fallback = $this->language->code === PhraseCatalog::SOURCE ? $source : '';

        return $this->stash[$token] ?? ($stored[$key] ?? $fallback);
    }

    private function pulseOk(string $copy): void
    {
        $packet = Pulse::craft($copy, __('dashboard.Saved'), 'ok');
        $this->js(
            'window.dispatchEvent(new CustomEvent('.json_encode(Pulse::EVENT).', { detail: '.json_encode($packet).' }))'
        );
    }

    private function pulseFail(string $copy): void
    {
        $packet = Pulse::craft($copy, null, 'fail');
        $this->js(
            'window.dispatchEvent(new CustomEvent('.json_encode(Pulse::EVENT).', { detail: '.json_encode($packet).' }))'
        );
    }
}
