<?php

namespace App\Finance;

final class CreditCost
{
    public static function usdPerCredit(): float
    {
        $tokens = max(1, (int) config('ai.credits.tokens_per_credit', 25000));
        $baseline = (float) config('ai.credits.baseline_output_per_mtok', 5.0);

        return ($tokens / 1_000_000) * max(0, $baseline);
    }

    public static function estimateUsd(int $credits): float
    {
        return round($credits * self::usdPerCredit(), 2);
    }
}
