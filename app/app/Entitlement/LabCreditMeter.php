<?php

namespace App\Entitlement;

use App\Ai\Cost\CostEstimator;
use App\Ai\Data\ToolCall;

/**
 * Turn real Lab spend (tokens, model rate, VFS/tool load) into integer credits.
 *
 * A short chat on a cheap model lands near 1 credit. A large codegen turn
 * on the same model lands in the mid-teens. Premium models scale up.
 */
final class LabCreditMeter
{
    public const MIN_CHARGE = 1;

    public function __construct(
        private readonly CostEstimator $costs,
    ) {}

    /**
     * @param  array<string, mixed>|null  $usage  UsageNormalizer shape
     * @param  list<ToolCall|array<string, mixed>>  $toolCalls
     */
    public function quote(?array $usage, string $modelId, array $toolCalls = []): int
    {
        $input = max(0, (int) ($usage['input_tokens'] ?? 0));
        $output = max(0, (int) ($usage['output_tokens'] ?? 0));
        $cached = max(0, (int) ($usage['cached_tokens'] ?? 0));
        $cacheCreation = max(0, (int) ($usage['cache_creation_tokens'] ?? 0));

        $freshInput = max(0, $input - $cached);
        $outputWeight = (float) config('ai.credits.output_weight', 4);
        $cachedWeight = (float) config('ai.credits.cached_weight', 0.25);
        $cacheCreateWeight = (float) config('ai.credits.cache_creation_weight', 1.25);

        $weighted = $freshInput
            + ($cached * $cachedWeight)
            + ($cacheCreation * $cacheCreateWeight)
            + ($output * $outputWeight);

        $weighted *= $this->modelCoefficient($modelId);

        $perCredit = max(1, (int) config('ai.credits.tokens_per_credit', 25000));
        $tokenCredits = max(self::MIN_CHARGE, (int) ceil($weighted / $perCredit));

        return $tokenCredits + $this->runnerLoad($toolCalls);
    }

    public function modelCoefficient(string $modelId): float
    {
        $explicit = config('ai.credits.model_coefficients.'.$modelId);
        if (is_numeric($explicit)) {
            return max(0.25, min(8.0, (float) $explicit));
        }

        $pricing = $this->costs->pricingFor($modelId);
        $baseline = (float) config('ai.credits.baseline_output_per_mtok', 5.0);

        if ($pricing === null || $baseline <= 0) {
            return 1.0;
        }

        $rate = (float) $pricing['output_per_mtok'];

        return max(0.25, min(8.0, $rate / $baseline));
    }

    /**
     * @param  list<ToolCall|array<string, mixed>>  $toolCalls
     */
    public function runnerLoad(array $toolCalls): int
    {
        $bytesPer = max(1, (int) config('ai.credits.vfs_bytes_per_credit', 80_000));
        $callsPer = max(1, (int) config('ai.credits.tool_calls_per_credit', 6));
        $writeTools = ['write_file', 'edit_file', 'apply_patch'];

        $bytes = 0;
        foreach ($toolCalls as $call) {
            $name = $call instanceof ToolCall
                ? $call->name
                : (string) ($call['name'] ?? '');
            $args = $call instanceof ToolCall
                ? $call->arguments
                : (is_array($call['arguments'] ?? null) ? $call['arguments'] : []);

            if (! in_array($name, $writeTools, true)) {
                continue;
            }

            $body = (string) ($args['content'] ?? $args['contents'] ?? $args['patch'] ?? '');
            $bytes += strlen($body);
        }

        return (int) floor($bytes / $bytesPer) + (int) floor(count($toolCalls) / $callsPer);
    }
}
