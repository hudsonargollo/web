<?php

namespace App\Ai\Data;

final readonly class ModelDefinition
{
    public function __construct(
        public string $id,
        public string $provider,
        public string $apiModel,
        public string $label,
        public string $family,
        public bool $available,
        public int $maxOutput = 8192,
    ) {}

    /**
     * @return array{id: string, provider: string, label: string, family: string, available: bool}
     */
    public function toCatalogArray(): array
    {
        return [
            'id' => $this->id,
            'provider' => $this->provider,
            'label' => $this->label,
            'family' => $this->family,
            'available' => $this->available,
        ];
    }
}
