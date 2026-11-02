<?php

namespace App\Ai\Cost;

use App\Ai\ModelCatalog;

/**
 * Rough USD estimates for Krikkit Lab / v0–Lovable style site-building sessions.
 * Pricing comes from config/ai.php → models.*.pricing (edit there as vendors change rates).
 */
final class CostEstimator
{
    public function __construct(
        private readonly ModelCatalog $catalog,
    ) {}

    public const PROJECT_COUNT_MIN = 1;

    public const PROJECT_COUNT_MAX = 1000;

    /**
     * @return list<array<string, mixed>>
     */
    public function scenarios(): array
    {
        /** @var array<string, array<string, mixed>> $scenarios */
        $scenarios = config('ai.cost_scenarios', []);
        $out = [];

        foreach ($scenarios as $id => $scenario) {
            $out[] = [
                'id' => (string) $id,
                'label' => (string) ($scenario['label'] ?? $id),
                'blurb' => (string) ($scenario['blurb'] ?? ''),
                'input_tokens' => (int) ($scenario['input_tokens'] ?? 0),
                'output_tokens' => (int) ($scenario['output_tokens'] ?? 0),
            ];
        }

        return $out;
    }

    /**
     * Estimate total API cost for N projects of a given scenario type.
     *
     * @return array{
     *     count: int,
     *     scenario: array{id: string, label: string, blurb: string, input_tokens: int, output_tokens: int},
     *     unit_cost_usd: float|null,
     *     cost_usd: float|null,
     *     pricing: array{input_per_mtok: float, output_per_mtok: float}|null
     * }
     */
    public function estimateProject(string $modelId, string $scenarioId, int $projectCount): array
    {
        $count = max(self::PROJECT_COUNT_MIN, min(self::PROJECT_COUNT_MAX, $projectCount));
        $scenarios = $this->scenarios();
        $scenario = collect($scenarios)->firstWhere('id', $scenarioId) ?? ($scenarios[0] ?? null);
        $pricing = $this->pricingFor($modelId);

        $unitCost = ($scenario && $pricing)
            ? $this->costUsd($scenario['input_tokens'], $scenario['output_tokens'], $pricing)
            : null;

        return [
            'count' => $count,
            'scenario' => $scenario,
            'unit_cost_usd' => $unitCost,
            'cost_usd' => $unitCost === null ? null : round($unitCost * $count, 4),
            'pricing' => $pricing,
        ];
    }

    /**
     * @return array{
     *     model: string,
     *     label: string,
     *     available: bool,
     *     pricing: array{input_per_mtok: float, output_per_mtok: float}|null,
     *     scenarios: list<array{id: string, label: string, blurb: string, input_tokens: int, output_tokens: int, cost_usd: float|null}>,
     *     monthly: array{light: float|null, studio: float|null, agency: float|null}
     * }
     */
    public function estimateFor(string $modelId): array
    {
        $model = $this->catalog->get($modelId);
        $pricing = $this->pricingFor($modelId);

        $scenarioRows = [];
        foreach ($this->scenarios() as $scenario) {
            $scenarioRows[] = [
                ...$scenario,
                'cost_usd' => $pricing
                    ? $this->costUsd($scenario['input_tokens'], $scenario['output_tokens'], $pricing)
                    : null,
            ];
        }

        // Monthly rollups for a product like Lovable / v0 usage bands.
        $landing = $this->scenarioCost($modelId, 'landing_draft');
        $fullSite = $this->scenarioCost($modelId, 'marketing_site');
        $iterate = $this->scenarioCost($modelId, 'iterate_pass');
        $saas = $this->scenarioCost($modelId, 'saas_multipage');

        return [
            'model' => $model->id,
            'label' => $model->label,
            'available' => $model->available,
            'pricing' => $pricing,
            'scenarios' => $scenarioRows,
            'monthly' => [
                // Indie tinkering: ~20 landing drafts + 10 iterate packs
                'light' => $this->sumNullable([
                    $this->scale($landing, 20),
                    $this->scale($iterate, 10),
                ]),
                // Active studio: ~40 marketing sites + 40 iterate packs + 10 SaaS builds
                'studio' => $this->sumNullable([
                    $this->scale($fullSite, 40),
                    $this->scale($iterate, 40),
                    $this->scale($saas, 10),
                ]),
                // Agency volume: ~120 marketing sites + 100 iterate packs + 30 SaaS builds
                'agency' => $this->sumNullable([
                    $this->scale($fullSite, 120),
                    $this->scale($iterate, 100),
                    $this->scale($saas, 30),
                ]),
            ],
        ];
    }

    /**
     * Compare one scenario across every catalog model.
     *
     * @return list<array{model: string, label: string, provider: string, available: bool, cost_usd: float|null}>
     */
    public function compareScenario(string $scenarioId): array
    {
        $scenario = collect($this->scenarios())->firstWhere('id', $scenarioId);
        if (! $scenario) {
            return [];
        }

        $rows = [];
        foreach ($this->catalog->all() as $model) {
            $pricing = $this->pricingFor($model->id);
            $rows[] = [
                'model' => $model->id,
                'label' => $model->label,
                'provider' => $model->provider,
                'available' => $model->available,
                'cost_usd' => $pricing
                    ? $this->costUsd($scenario['input_tokens'], $scenario['output_tokens'], $pricing)
                    : null,
            ];
        }

        usort($rows, function (array $a, array $b) {
            if ($a['cost_usd'] === null) {
                return 1;
            }
            if ($b['cost_usd'] === null) {
                return -1;
            }

            return $a['cost_usd'] <=> $b['cost_usd'];
        });

        return $rows;
    }

    public function scenarioCost(string $modelId, string $scenarioId): ?float
    {
        $scenario = collect($this->scenarios())->firstWhere('id', $scenarioId);
        $pricing = $this->pricingFor($modelId);
        if (! $scenario || ! $pricing) {
            return null;
        }

        return $this->costUsd($scenario['input_tokens'], $scenario['output_tokens'], $pricing);
    }

    /**
     * @return array{input_per_mtok: float, output_per_mtok: float}|null
     */
    public function pricingFor(string $modelId): ?array
    {
        /** @var array<string, mixed>|null $config */
        $config = config("ai.models.{$modelId}.pricing");
        if (! is_array($config)) {
            return null;
        }

        return [
            'input_per_mtok' => (float) ($config['input_per_mtok'] ?? 0),
            'output_per_mtok' => (float) ($config['output_per_mtok'] ?? 0),
        ];
    }

    /**
     * @param  array{input_per_mtok: float, output_per_mtok: float}  $pricing
     */
    public function costUsd(int $inputTokens, int $outputTokens, array $pricing): float
    {
        $input = ($inputTokens / 1_000_000) * $pricing['input_per_mtok'];
        $output = ($outputTokens / 1_000_000) * $pricing['output_per_mtok'];

        return round($input + $output, 4);
    }

    private function scale(?float $value, int $times): ?float
    {
        return $value === null ? null : round($value * $times, 4);
    }

    /**
     * @param  list<float|null>  $parts
     */
    private function sumNullable(array $parts): ?float
    {
        $sum = 0.0;
        foreach ($parts as $part) {
            if ($part === null) {
                return null;
            }
            $sum += $part;
        }

        return round($sum, 2);
    }
}
