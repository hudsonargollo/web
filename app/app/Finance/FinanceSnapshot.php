<?php

namespace App\Finance;

use App\Entitlement\EntitlementCatalog;
use App\Entitlement\UsageWindow;
use App\Models\CreditGrant;
use App\Models\Invoice;
use App\Models\PaymentWebhookEvent;
use App\Models\UsageLedger;
use App\Models\UserEntitlement;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Schema;

final class FinanceSnapshot
{
    /**
     * @return array{
     *     mrr: float,
     *     collected: float,
     *     collected_delta: float|null,
     *     failed: int,
     *     failed_delta: float|null,
     *     canceled: int,
     *     canceled_delta: float|null,
     *     credit_liability: int,
     *     unlimited_holders: int,
     *     api_usd: float,
     *     net: float,
     *     credits_burned: int,
     *     active: int,
     *     currency: string,
     *     month: string,
     *     series: list<array{label: string, value: float}>,
     *     mix: list<array{driver: string, amount: float, share: float}>,
     *     health: array{paid: int, open: int, failed: int, refunded: int}
     * }
     */
    public function cards(?Carbon $at = null): array
    {
        $at ??= now();
        $start = $at->copy()->startOfMonth();
        $end = $at->copy()->endOfMonth();
        $liability = $this->creditLiability();
        $burned = $this->creditsBurned($at);
        $collected = $this->collected($start, $end);
        $prevCollected = $this->collected($start->copy()->subMonth(), $end->copy()->subMonth());
        $apiUsd = CreditCost::estimateUsd($burned);
        $failed = $this->failedCount($start, $end);
        $canceled = $this->canceledCount($start, $end);
        $prevFailed = $this->failedCount($start->copy()->subMonth(), $end->copy()->subMonth());
        $prevCanceled = $this->canceledCount($start->copy()->subMonth(), $end->copy()->subMonth());

        return [
            'mrr' => $this->mrr(),
            'collected' => $collected,
            'collected_delta' => $this->delta($collected, $prevCollected),
            'failed' => $failed,
            'failed_delta' => $this->delta((float) $failed, (float) $prevFailed),
            'canceled' => $canceled,
            'canceled_delta' => $this->delta((float) $canceled, (float) $prevCanceled),
            'credit_liability' => $liability['credits'],
            'unlimited_holders' => $liability['unlimited'],
            'api_usd' => $apiUsd,
            'net' => round($collected - $apiUsd, 2),
            'credits_burned' => $burned,
            'active' => $this->activeCount(),
            'currency' => Money::defaultCurrency(),
            'month' => $at->format('F Y'),
            'series' => $this->collectionSeries($at),
            'mix' => $this->driverMix($start, $end),
            'health' => $this->invoiceHealth($start, $end),
        ];
    }

    /**
     * @return Collection<int, Invoice>
     */
    public function recentInvoices(int $limit = 6): Collection
    {
        if (! Schema::hasTable('invoices')) {
            return collect();
        }

        return Invoice::query()
            ->with(['user', 'plan'])
            ->orderByDesc('id')
            ->limit($limit)
            ->get();
    }

    /**
     * @return Collection<int, PaymentWebhookEvent>
     */
    public function recentEvents(int $limit = 6): Collection
    {
        if (! Schema::hasTable('payment_webhook_events')) {
            return collect();
        }

        return PaymentWebhookEvent::query()
            ->orderByDesc('id')
            ->limit($limit)
            ->get();
    }

    /**
     * @return Collection<int, CreditGrant>
     */
    public function recentGrants(int $limit = 6): Collection
    {
        if (! Schema::hasTable('credit_grants')) {
            return collect();
        }

        return CreditGrant::query()
            ->with(['user', 'actor', 'plan'])
            ->orderByDesc('id')
            ->limit($limit)
            ->get();
    }

    /**
     * @return list<array{label: string, value: float}>
     */
    public function collectionSeries(Carbon $at, int $months = 6): array
    {
        $series = [];

        for ($i = $months - 1; $i >= 0; $i--) {
            $month = $at->copy()->subMonths($i);
            $series[] = [
                'label' => $month->format('M'),
                'value' => $this->collected($month->copy()->startOfMonth(), $month->copy()->endOfMonth()),
            ];
        }

        return $series;
    }

    public function mrr(): float
    {
        if (! Schema::hasTable('user_entitlements')) {
            return 0.0;
        }

        $rows = UserEntitlement::query()
            ->where('status', SubscriptionStatus::Active)
            ->where(function ($query): void {
                $query->whereNull('ends_at')->orWhere('ends_at', '>', now());
            })
            ->with('plan')
            ->get();

        return round($rows->sum(fn (UserEntitlement $row) => $this->monthlyValue($row)), 2);
    }

    private function monthlyValue(UserEntitlement $row): float
    {
        $plan = $row->plan;
        if ($plan === null) {
            return 0.0;
        }

        $monthly = Money::major($plan->price_monthly);
        $yearly = Money::major($plan->price_yearly);
        $interval = $row->interval ?? ($yearly > 0 && $monthly <= 0 ? BillingInterval::Yearly : BillingInterval::Monthly);

        if ($interval === BillingInterval::Yearly) {
            return $yearly > 0 ? $yearly / 12 : 0.0;
        }

        return $monthly;
    }

    private function collected(Carbon $start, Carbon $end): float
    {
        if (! Schema::hasTable('invoices')) {
            return 0.0;
        }

        return round((float) Invoice::query()
            ->where('status', InvoiceStatus::Paid)
            ->whereBetween('paid_at', [$start, $end])
            ->sum('amount'), 2);
    }

    private function failedCount(Carbon $start, Carbon $end): int
    {
        if (! Schema::hasTable('invoices')) {
            return 0;
        }

        return Invoice::query()
            ->where('status', InvoiceStatus::Failed)
            ->whereBetween('updated_at', [$start, $end])
            ->count();
    }

    private function canceledCount(Carbon $start, Carbon $end): int
    {
        if (! Schema::hasTable('user_entitlements')) {
            return 0;
        }

        return UserEntitlement::query()
            ->where('status', SubscriptionStatus::Canceled)
            ->where(function ($query) use ($start, $end): void {
                $query->whereBetween('updated_at', [$start, $end])
                    ->orWhereBetween('ends_at', [$start, $end]);
            })
            ->count();
    }

    /**
     * @return array{credits: int, unlimited: int}
     */
    private function creditLiability(): array
    {
        if (! Schema::hasTable('user_entitlements')) {
            return ['credits' => 0, 'unlimited' => 0];
        }

        $used = Schema::hasTable('usage_ledgers')
            ? UsageLedger::query()
                ->where('code', EntitlementCatalog::LAB_CREDITS)
                ->where('window_key', UsageWindow::Monthly->periodKey())
                ->pluck('consumed', 'user_id')
            : collect();

        $bonus = Schema::hasTable('credit_grants')
            ? CreditGrant::query()
                ->selectRaw('user_id, sum(amount) as total')
                ->groupBy('user_id')
                ->pluck('total', 'user_id')
            : collect();

        $credits = 0;
        $unlimited = 0;

        $rows = UserEntitlement::query()
            ->where('status', SubscriptionStatus::Active)
            ->with('plan.grants')
            ->get();

        foreach ($rows as $row) {
            $grant = $row->plan?->grantFor(EntitlementCatalog::LAB_CREDITS);
            if ($grant?->isUnlimited()) {
                $unlimited++;

                continue;
            }

            $ceiling = (int) ($grant?->ceiling ?? 0);
            $extra = (int) ($bonus[$row->user_id] ?? 0);
            $spent = (int) ($used[$row->user_id] ?? 0);
            $credits += max(0, $ceiling + $extra - $spent);
        }

        return ['credits' => $credits, 'unlimited' => $unlimited];
    }

    private function creditsBurned(Carbon $at): int
    {
        if (! Schema::hasTable('usage_ledgers')) {
            return 0;
        }

        return (int) UsageLedger::query()
            ->where('code', EntitlementCatalog::LAB_CREDITS)
            ->where('window_key', UsageWindow::Monthly->periodKey($at))
            ->sum('consumed');
    }

    private function activeCount(): int
    {
        if (! Schema::hasTable('user_entitlements')) {
            return 0;
        }

        return UserEntitlement::query()
            ->where('status', SubscriptionStatus::Active)
            ->where(function ($query): void {
                $query->whereNull('ends_at')->orWhere('ends_at', '>', now());
            })
            ->count();
    }

    /**
     * @return list<array{driver: string, amount: float, share: float}>
     */
    private function driverMix(Carbon $start, Carbon $end): array
    {
        if (! Schema::hasTable('invoices')) {
            return [];
        }

        $rows = Invoice::query()
            ->selectRaw('driver, sum(amount) as total')
            ->where('status', InvoiceStatus::Paid)
            ->whereBetween('paid_at', [$start, $end])
            ->groupBy('driver')
            ->pluck('total', 'driver');

        $sum = max(0.01, (float) $rows->sum());

        return $rows
            ->map(fn ($amount, $driver) => [
                'driver' => (string) $driver,
                'amount' => round((float) $amount, 2),
                'share' => round(((float) $amount / $sum) * 100, 1),
            ])
            ->values()
            ->all();
    }

    /**
     * @return array{paid: int, open: int, failed: int, refunded: int}
     */
    private function invoiceHealth(Carbon $start, Carbon $end): array
    {
        $empty = ['paid' => 0, 'open' => 0, 'failed' => 0, 'refunded' => 0];

        if (! Schema::hasTable('invoices')) {
            return $empty;
        }

        $counts = Invoice::query()
            ->selectRaw('status, count(*) as total')
            ->where(function ($query) use ($start, $end): void {
                $query->whereBetween('paid_at', [$start, $end])
                    ->orWhereBetween('updated_at', [$start, $end]);
            })
            ->groupBy('status')
            ->pluck('total', 'status');

        return [
            'paid' => (int) ($counts[InvoiceStatus::Paid->value] ?? 0),
            'open' => (int) ($counts[InvoiceStatus::Open->value] ?? 0),
            'failed' => (int) ($counts[InvoiceStatus::Failed->value] ?? 0),
            'refunded' => (int) ($counts[InvoiceStatus::Refunded->value] ?? 0),
        ];
    }

    private function delta(float $current, float $previous): ?float
    {
        if ($previous <= 0) {
            return null;
        }

        return round((($current - $previous) / $previous) * 100, 1);
    }
}
