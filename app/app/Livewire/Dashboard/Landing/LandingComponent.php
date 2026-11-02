<?php

namespace App\Livewire\Dashboard\Landing;

use App\Livewire\Dashboard\Settings\Traits\ManagesSiteAssets;
use App\Support\Site\LandingCopy;
use App\Support\Site\SiteSettings;
use App\Support\Ui\Pulse;
use Illuminate\Contracts\View\View;
use Illuminate\Support\Facades\Gate;
use Livewire\Attributes\Layout;
use Livewire\Attributes\Url;
use Livewire\Component;
use Livewire\Features\SupportFileUploads\TemporaryUploadedFile;
use Livewire\WithFileUploads;

#[Layout('components.layouts.dashboard', ['skeleton' => 'form'])]
class LandingComponent extends Component
{
    use ManagesSiteAssets;
    use WithFileUploads;

    #[Url]
    public string $tab = 'header';

    /** @var array<string, mixed> */
    public array $header = [];

    /** @var array<string, mixed> */
    public array $hero = [];

    /** @var array<string, mixed> */
    public array $problem = [];

    /** @var array<string, mixed> */
    public array $platform = [];

    /** @var array<string, mixed> */
    public array $agents = [];

    /** @var array<string, mixed> */
    public array $walkthrough = [];

    /** @var array<string, mixed> */
    public array $integrations = [];

    /** @var array<string, mixed> */
    public array $faq = [];

    /** @var array<string, mixed> */
    public array $cta = [];

    /** @var array<string, mixed> */
    public array $footer = [];

    public mixed $asciiFile = null;

    public bool $removeAscii = false;

    /** @var array<int, mixed> */
    public array $walkFiles = [];

    /**
     * @return array{title: string, breadcrumbs: list<array{label: string, href?: string, current?: bool}>}
     */
    public function layoutData(): array
    {
        return [
            'title' => __('dashboard.Landing page'),
            'breadcrumbs' => [
                ['label' => __('dashboard.Landing page'), 'current' => true],
            ],
        ];
    }

    public function mount(LandingCopy $landing): void
    {
        Gate::authorize('settings.revise');
        $this->fillFrom($landing);
    }

    public function selectTab(string $tab): void
    {
        if (array_key_exists($tab, $this->tabs())) {
            $this->tab = $tab;
        }
    }

    public function addLink(string $group): void
    {
        if ($group === 'header') {
            $this->header['links'][] = ['label' => '', 'href' => ''];
        }
    }

    public function removeLink(string $group, int $index): void
    {
        if ($group === 'header') {
            array_splice($this->header['links'], $index, 1);
            $this->header['links'] = array_values($this->header['links']);
        }
    }

    public function addLayer(): void
    {
        $this->platform['layers'][] = ['title' => '', 'copy' => ''];
    }

    public function removeLayer(int $index): void
    {
        array_splice($this->platform['layers'], $index, 1);
        $this->platform['layers'] = array_values($this->platform['layers']);
    }

    public function addStat(): void
    {
        $this->platform['stats'][] = '';
    }

    public function removeStat(int $index): void
    {
        array_splice($this->platform['stats'], $index, 1);
        $this->platform['stats'] = array_values($this->platform['stats']);
    }

    public function addAgent(): void
    {
        $this->agents['items'][] = ['title' => '', 'copy' => ''];
    }

    public function removeAgent(int $index): void
    {
        array_splice($this->agents['items'], $index, 1);
        $this->agents['items'] = array_values($this->agents['items']);
    }

    public function addWalkTab(): void
    {
        $this->walkthrough['tabs'][] = ['label' => '', 'title' => '', 'copy' => '', 'image' => ''];
    }

    public function removeWalkTab(int $index): void
    {
        array_splice($this->walkthrough['tabs'], $index, 1);
        $this->walkthrough['tabs'] = array_values($this->walkthrough['tabs']);
        unset($this->walkFiles[$index]);
        $this->walkFiles = array_values($this->walkFiles);
    }

    public function addFaq(): void
    {
        $this->faq['items'][] = ['q' => '', 'a' => ''];
    }

    public function removeFaq(int $index): void
    {
        array_splice($this->faq['items'], $index, 1);
        $this->faq['items'] = array_values($this->faq['items']);
    }

    public function addFooterLink(int $column): void
    {
        $this->footer['columns'][$column]['links'][] = ['label' => '', 'href' => ''];
    }

    public function removeFooterLink(int $column, int $index): void
    {
        array_splice($this->footer['columns'][$column]['links'], $index, 1);
        $this->footer['columns'][$column]['links'] = array_values($this->footer['columns'][$column]['links']);
    }

    public function addSocial(): void
    {
        $this->footer['social'][] = ['label' => '', 'href' => ''];
    }

    public function removeSocial(int $index): void
    {
        array_splice($this->footer['social'], $index, 1);
        $this->footer['social'] = array_values($this->footer['social']);
    }

    public function addLegalExtra(): void
    {
        $this->footer['legal_extra'][] = '';
    }

    public function removeLegalExtra(int $index): void
    {
        array_splice($this->footer['legal_extra'], $index, 1);
        $this->footer['legal_extra'] = array_values($this->footer['legal_extra']);
    }

    public function dropAsset(string $key): void
    {
        if ($key === 'asciiFile') {
            $this->asciiFile = null;
            $this->removeAscii = true;
        }
    }

    public function save(SiteSettings $site, LandingCopy $landing): void
    {
        Gate::authorize('settings.revise');

        $this->validate($this->rules());

        $walk = $this->walkthrough;
        $walk['ascii_source'] = $this->persistAsset(
            'asciiFile',
            is_string($walk['ascii_source'] ?? null) ? $walk['ascii_source'] : null,
            'landing',
            $this->removeAscii,
        );

        foreach ($walk['tabs'] ?? [] as $index => $tab) {
            $file = $this->walkFiles[$index] ?? null;
            if ($file instanceof TemporaryUploadedFile) {
                $walk['tabs'][$index]['image'] = $file->store('landing', 'public');
            } else {
                $walk['tabs'][$index]['image'] = trim((string) ($tab['image'] ?? ''));
            }
        }

        $site->put('landing', [
            'header' => $this->cleanHeader(),
            'hero' => $this->trimAssoc($this->hero),
            'problem' => $this->trimAssoc($this->problem),
            'platform' => $this->cleanPlatform(),
            'agents' => $this->cleanAgents(),
            'walkthrough' => $walk,
            'integrations' => $this->trimAssoc($this->integrations),
            'faq' => $this->cleanFaq(),
            'cta' => $this->trimAssoc($this->cta),
            'footer' => $this->cleanFooter(),
        ]);

        $this->fillFrom($landing);
        $this->pulseOk(__('dashboard.Landing saved.'));
    }

    public function render(LandingCopy $landing): View
    {
        if (! array_key_exists($this->tab, $this->tabs())) {
            $this->tab = 'header';
        }

        $walk = $landing->section('walkthrough');

        return view('livewire.dashboard.landing.landing', [
            'tabs' => $this->tabs(),
            'asciiPreview' => $this->previewUrl(
                $this->asciiFile,
                is_string($walk['ascii_source'] ?? null) ? $walk['ascii_source'] : null,
                $this->removeAscii,
            ) ?? $landing->asciiUrl(),
            'hrefHint' => __('dashboard.Use #section, /path, https://…, or lab / dashboard / login / register / blog / contact / pricing.'),
        ])->layoutData($this->layoutData());
    }

    /**
     * @return array<string, string>
     */
    private function tabs(): array
    {
        return [
            'header' => __('dashboard.Header'),
            'hero' => __('dashboard.Hero'),
            'problem' => __('dashboard.Problem'),
            'platform' => __('dashboard.Platform'),
            'agents' => __('dashboard.Agents'),
            'walkthrough' => __('dashboard.Walkthrough'),
            'integrations' => __('dashboard.Integrations'),
            'faq' => __('dashboard.FAQ'),
            'cta' => __('dashboard.Call to action'),
            'footer' => __('dashboard.Footer'),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function rules(): array
    {
        return [
            'header.guest_link_label' => ['nullable', 'string', 'max:80'],
            'header.guest_cta_label' => ['nullable', 'string', 'max:80'],
            'hero.title' => ['required', 'string', 'max:160'],
            'hero.copy' => ['nullable', 'string', 'max:400'],
            'asciiFile' => ['nullable', 'file', 'max:4096', 'mimes:png,jpg,jpeg,webp'],
            'walkFiles.*' => ['nullable', 'file', 'max:4096', 'mimes:png,jpg,jpeg,webp'],
        ];
    }

    private function fillFrom(LandingCopy $landing): void
    {
        $all = $landing->all();
        $this->header = $all['header'];
        $this->hero = $all['hero'];
        $this->problem = $all['problem'];
        $this->platform = $all['platform'];
        $this->agents = $all['agents'];
        $this->walkthrough = $all['walkthrough'];
        $this->integrations = $all['integrations'];
        $this->faq = $all['faq'];
        $this->cta = $all['cta'];
        $this->footer = $all['footer'];
        $this->asciiFile = null;
        $this->removeAscii = false;
        $this->walkFiles = [];

        if (! array_key_exists($this->tab, $this->tabs())) {
            $this->tab = 'header';
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function cleanHeader(): array
    {
        $header = $this->trimAssoc($this->header);
        $header['links'] = $this->cleanPairs($this->header['links'] ?? [], ['label', 'href']);

        return $header;
    }

    /**
     * @return array<string, mixed>
     */
    private function cleanPlatform(): array
    {
        $platform = $this->trimAssoc($this->platform);
        $platform['layers'] = $this->cleanPairs($this->platform['layers'] ?? [], ['title', 'copy']);
        $platform['stats'] = array_values(array_filter(array_map(
            static fn (mixed $stat): string => trim((string) $stat),
            $this->platform['stats'] ?? [],
        )));

        return $platform;
    }

    /**
     * @return array<string, mixed>
     */
    private function cleanAgents(): array
    {
        $agents = $this->trimAssoc($this->agents);
        $agents['items'] = $this->cleanPairs($this->agents['items'] ?? [], ['title', 'copy']);

        return $agents;
    }

    /**
     * @return array<string, mixed>
     */
    private function cleanFaq(): array
    {
        $faq = $this->trimAssoc($this->faq);
        $faq['items'] = $this->cleanPairs($this->faq['items'] ?? [], ['q', 'a']);

        return $faq;
    }

    /**
     * @return array<string, mixed>
     */
    private function cleanFooter(): array
    {
        $footer = $this->trimAssoc($this->footer);
        $columns = [];
        foreach ($this->footer['columns'] ?? [] as $column) {
            if (! is_array($column)) {
                continue;
            }
            $columns[] = [
                'heading' => trim((string) ($column['heading'] ?? '')),
                'links' => $this->cleanPairs($column['links'] ?? [], ['label', 'href']),
            ];
        }
        $footer['columns'] = $columns;
        $footer['social'] = $this->cleanPairs($this->footer['social'] ?? [], ['label', 'href']);
        $footer['legal_extra'] = array_values(array_filter(array_map(
            static fn (mixed $item): string => trim((string) $item),
            $this->footer['legal_extra'] ?? [],
        )));

        return $footer;
    }

    /**
     * @param  array<string, mixed>  $values
     * @return array<string, mixed>
     */
    private function trimAssoc(array $values): array
    {
        $out = [];
        foreach ($values as $key => $value) {
            $out[$key] = is_string($value) ? trim($value) : $value;
        }

        return $out;
    }

    /**
     * @param  list<string>  $keys
     * @return list<array<string, string>>
     */
    private function cleanPairs(mixed $rows, array $keys): array
    {
        if (! is_array($rows)) {
            return [];
        }

        $out = [];
        foreach ($rows as $row) {
            if (! is_array($row)) {
                continue;
            }
            $clean = [];
            $filled = false;
            foreach ($keys as $key) {
                $clean[$key] = trim((string) ($row[$key] ?? ''));
                $filled = $filled || $clean[$key] !== '';
            }
            if ($filled) {
                $out[] = $clean;
            }
        }

        return $out;
    }

    private function pulseOk(string $copy): void
    {
        $packet = Pulse::craft($copy, __('dashboard.Saved'), 'ok');
        $this->js(
            'window.dispatchEvent(new CustomEvent('.json_encode(Pulse::EVENT).', { detail: '.json_encode($packet).' }))'
        );
    }
}
