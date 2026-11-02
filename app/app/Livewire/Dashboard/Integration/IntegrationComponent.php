<?php

namespace App\Livewire\Dashboard\Integration;

use App\Ai\ModelCatalog;
use App\Ai\Settings\AiSettingsRepository;
use App\Datastore\DatastoreKind;
use App\Integrations\WorkspaceOauthAppStore;
use App\Support\Ui\Pulse;
use App\Visuals\VisualCatalog;
use App\Visuals\VisualCredentialStore;
use Illuminate\Contracts\View\View;
use Illuminate\Support\Facades\Gate;
use Livewire\Attributes\Layout;
use Livewire\Attributes\Lazy;
use Livewire\Component;

#[Lazy]
#[Layout('components.layouts.dashboard', ['skeleton' => 'table'])]
class IntegrationComponent extends Component
{
    public string $defaultModel = '';

    public function placeholder(): View
    {
        return view('components.dashboard.livewirePlaceholder', ['variant' => 'table'])
            ->layoutData($this->layoutData());
    }

    /**
     * @return array{title: string}
     */
    public function layoutData(): array
    {
        return [
            'title' => __('dashboard.API Integration'),
        ];
    }

    public function mount(): void
    {
        Gate::authorize('ai.revise');

        $settings = app(AiSettingsRepository::class);
        $catalog = app(ModelCatalog::class);

        $this->defaultModel = $settings->defaultModelId() ?: $catalog->defaultId();
    }

    public function saveDefaults(AiSettingsRepository $settings, ModelCatalog $catalog): void
    {
        Gate::authorize('ai.revise');

        $this->validate([
            'defaultModel' => ['required', 'string', 'in:'.implode(',', $catalog->ids())],
        ]);

        $settings->setDefaultModelId($this->defaultModel);
        $this->pulseOk(__('dashboard.Default model saved.'));
    }

    public function render(
        ModelCatalog $catalog,
        AiSettingsRepository $settings,
        WorkspaceOauthAppStore $oauthApps,
        VisualCatalog $visuals,
        VisualCredentialStore $visualKeys,
        DatastoreKind $datastores,
    ): View {
        $providers = [];
        foreach (config('ai.providers', []) as $key => $config) {
            $models = array_values(array_filter(
                $catalog->all(),
                fn ($model) => $model->provider === $key
            ));

            $providers[] = [
                'id' => (string) $key,
                'label' => (string) ($config['label'] ?? $key),
                'source' => $settings->keySource((string) $key),
                'masked' => $settings->maskedKey((string) $key),
                'enabled' => $settings->isEnabled((string) $key),
                'models' => $models,
                'models_label' => null,
            ];
        }

        $github = $oauthApps->get(WorkspaceOauthAppStore::DRIVER_GITHUB);
        $providers[] = [
            'id' => WorkspaceOauthAppStore::DRIVER_GITHUB,
            'label' => (string) __('dashboard.GitHub'),
            'source' => $github['source'],
            'masked' => $oauthApps->maskedSecret(WorkspaceOauthAppStore::DRIVER_GITHUB),
            'enabled' => $github['enabled'],
            'models' => [],
            'models_label' => (string) __('dashboard.Lab OAuth'),
        ];

        foreach ($visuals->ids() as $catalogId) {
            $providers[] = [
                'id' => $catalogId,
                'label' => $visuals->label($catalogId),
                'source' => $visualKeys->keySource($catalogId),
                'masked' => $visualKeys->maskedKey($catalogId),
                'enabled' => $visualKeys->isEnabled($catalogId),
                'models' => [],
                'models_label' => (string) __('dashboard.Lab photographs'),
            ];
        }

        foreach ($datastores->ids() as $kind) {
            $app = $oauthApps->get($kind);
            $providers[] = [
                'id' => $kind,
                'label' => $datastores->label($kind),
                'source' => $app['source'],
                'masked' => $oauthApps->maskedSecret($kind),
                'enabled' => $app['enabled'],
                'models' => [],
                'models_label' => (string) __('dashboard.Lab OAuth'),
            ];
        }

        return view('livewire.dashboard.integration.integration', [
            'models' => $catalog->all(),
            'providers' => $providers,
        ])->layoutData($this->layoutData());
    }

    private function pulseOk(string $copy): void
    {
        $packet = Pulse::craft($copy, __('dashboard.Saved'), 'ok');

        $this->js(
            'window.dispatchEvent(new CustomEvent('.json_encode(Pulse::EVENT).', { detail: '.json_encode($packet).' }))'
        );
    }
}
