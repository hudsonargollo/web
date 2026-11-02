<?php

namespace App\Ai;

use App\Ai\Data\ModelDefinition;
use App\Ai\Exceptions\UnknownModelException;
use App\Ai\Settings\AiSettingsRepository;
use App\Support\Account\DeskPreferences;

final class ModelCatalog
{
    /**
     * @param  array<string, array<string, mixed>>  $models
     */
    public function __construct(
        private readonly array $models,
        private readonly AiSettingsRepository $settings,
    ) {}

    public function defaultId(): string
    {
        $preferred = DeskPreferences::for(auth()->user())['default_model'];

        if ($preferred !== '' && $this->has($preferred)) {
            return $preferred;
        }

        $configured = $this->settings->defaultModelId();

        if ($this->has($configured)) {
            return $configured;
        }

        $first = array_key_first($this->models);

        return is_string($first) ? $first : '';
    }

    public function has(string $modelId): bool
    {
        return isset($this->models[$modelId]);
    }

    public function get(string $modelId): ModelDefinition
    {
        if (! isset($this->models[$modelId])) {
            throw UnknownModelException::for($modelId);
        }

        return $this->hydrate($modelId, $this->models[$modelId]);
    }

    /**
     * @return list<ModelDefinition>
     */
    public function all(bool $onlyAvailable = false): array
    {
        $items = [];

        foreach ($this->models as $id => $config) {
            $model = $this->hydrate((string) $id, $config);
            if ($onlyAvailable && ! $model->available) {
                continue;
            }
            $items[] = $model;
        }

        return $items;
    }

    /**
     * @return list<string>
     */
    public function ids(): array
    {
        return array_map('strval', array_keys($this->models));
    }

    /**
     * @return array{default: string, models: list<array{id: string, provider: string, label: string, family: string, available: bool}>}
     */
    public function toPickerPayload(bool $onlyAvailable = false): array
    {
        return [
            'default' => $this->defaultId(),
            'models' => array_map(
                fn (ModelDefinition $model) => $model->toCatalogArray(),
                $this->all($onlyAvailable),
            ),
        ];
    }

    /**
     * @param  array<string, mixed>  $config
     */
    private function hydrate(string $id, array $config): ModelDefinition
    {
        $provider = (string) ($config['provider'] ?? '');
        $key = $this->settings->apiKey($provider);

        return new ModelDefinition(
            id: $id,
            provider: $provider,
            apiModel: (string) ($config['api_model'] ?? $id),
            label: (string) ($config['label'] ?? $id),
            family: (string) ($config['family'] ?? $provider),
            available: $key !== '',
            maxOutput: max(1, (int) ($config['max_output'] ?? 8192)),
        );
    }
}
