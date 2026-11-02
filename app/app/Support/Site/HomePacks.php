<?php

namespace App\Support\Site;

use App\Entitlement\EntitlementCatalog;
use App\Entitlement\EntitlementGate;
use App\Entitlement\PlanBlueprint;
use App\Finance\Money;
use App\Models\EntitlementPlan;
use App\Models\User;
use Illuminate\Support\Facades\Schema;

final class HomePacks
{
    /**
     * @return list<array{
     *     slug: string,
     *     title: string,
     *     summary: string,
     *     price: string,
     *     priceYearly: string,
     *     hint: string,
     *     featured: bool,
     *     cta: string,
     *     checkout: string|null,
     *     contact: string|null,
     *     bullets: list<string>
     * }>
     */
    public static function cards(): array
    {
        $live = collect();

        if (Schema::hasTable('entitlement_plans')) {
            $live = EntitlementPlan::query()
                ->where('is_active', true)
                ->get()
                ->keyBy('slug');
        }

        $cards = [];

        foreach (PlanBlueprint::packs() as $pack) {
            $row = $live->get($pack['slug']);
            $slug = (string) $pack['slug'];

            $cards[] = [
                'slug' => $slug,
                'title' => (string) ($row?->title ?? $pack['title']),
                'summary' => (string) ($row?->summary ?? $pack['summary']),
                'price' => self::priceLabel($row, $pack, 'monthly'),
                'priceYearly' => self::priceLabel($row, $pack, 'yearly'),
                'hint' => self::hint($slug),
                'featured' => $slug === 'pro',
                'cta' => self::cta($slug),
                'checkout' => $row instanceof EntitlementPlan && $slug !== 'free' && $slug !== 'agency'
                    ? route('checkout.start', $row)
                    : null,
                'contact' => $row instanceof EntitlementPlan && $slug === 'agency'
                    ? route('contact', ['pack' => $row->public_id])
                    : null,
                'bullets' => self::bullets($pack['grants']),
            ];
        }

        return $cards;
    }

    /**
     * Higher-rank packs than the account currently holds.
     *
     * @return list<array{
     *     slug: string,
     *     title: string,
     *     summary: string,
     *     price: string,
     *     priceYearly: string,
     *     hint: string,
     *     featured: bool,
     *     cta: string,
     *     checkout: string|null,
     *     contact: string|null,
     *     bullets: list<string>
     * }>
     */
    public static function upgradeOffers(User $user): array
    {
        $current = app(EntitlementGate::class)->planFor($user);
        $live = collect();

        if (Schema::hasTable('entitlement_plans')) {
            $live = EntitlementPlan::query()
                ->where('is_active', true)
                ->get()
                ->keyBy('slug');
        }

        $offers = [];

        foreach (self::cards() as $card) {
            $row = $live->get($card['slug']);

            if (! $row instanceof EntitlementPlan) {
                continue;
            }

            if ((int) $row->rank <= (int) $current->rank) {
                continue;
            }

            $card['cta'] = (string) __('settings.Upgrade');
            $offers[] = $card;
        }

        return $offers;
    }

    /**
     * @return list<string>
     */
    public static function features(EntitlementPlan $plan): array
    {
        foreach (self::cards() as $card) {
            if ($card['slug'] === $plan->slug) {
                return $card['bullets'];
            }
        }

        return [];
    }

    /**
     * @return array{columns: list<string>, rows: list<array{label: string, values: list<array{type: string, text?: string, on?: bool}>}>}
     */
    public static function comparison(): array
    {
        $packs = PlanBlueprint::packs();
        $columns = [];
        foreach ($packs as $pack) {
            $columns[] = (string) $pack['title'];
        }

        $defs = [
            ['label' => __('home.projects'), 'code' => EntitlementCatalog::PROJECTS, 'kind' => 'quota'],
            ['label' => __('home.Lab credits / mo'), 'code' => EntitlementCatalog::LAB_CREDITS, 'kind' => 'quota'],
            ['label' => __('home.Custom subdomain'), 'code' => EntitlementCatalog::CUSTOM_SUBDOMAIN, 'kind' => 'feature'],
            ['label' => __('home.Custom domain'), 'code' => EntitlementCatalog::CUSTOM_DOMAIN, 'kind' => 'feature'],
            ['label' => __('home.Advanced export'), 'code' => EntitlementCatalog::ADVANCED_EXPORT, 'kind' => 'feature'],
            ['label' => __('home.GitHub import'), 'code' => EntitlementCatalog::GITHUB_IMPORT, 'kind' => 'feature'],
        ];

        $rows = [];
        foreach ($defs as $def) {
            $values = [];
            foreach ($packs as $pack) {
                $grant = $pack['grants'][$def['code']] ?? [];
                if ($def['kind'] === 'quota') {
                    $values[] = [
                        'type' => 'text',
                        'text' => self::amount($grant['ceiling'] ?? null),
                    ];

                    continue;
                }

                $values[] = [
                    'type' => 'flag',
                    'on' => (bool) ($grant['allowed'] ?? false),
                ];
            }

            $rows[] = [
                'label' => $def['label'],
                'values' => $values,
            ];
        }

        return [
            'columns' => $columns,
            'rows' => $rows,
        ];
    }

    /**
     * @param  array<string, array{allowed?: bool, ceiling?: int|null}>  $grants
     * @return list<string>
     */
    private static function bullets(array $grants): array
    {
        $projects = $grants[EntitlementCatalog::PROJECTS]['ceiling'] ?? null;
        $credits = $grants[EntitlementCatalog::LAB_CREDITS]['ceiling'] ?? null;

        $lines = [
            self::amount($projects).' '.__('home.projects'),
            self::amount($credits).' '.__('home.Lab credits / mo'),
        ];

        foreach ([
            EntitlementCatalog::CUSTOM_SUBDOMAIN => __('home.Custom subdomain'),
            EntitlementCatalog::CUSTOM_DOMAIN => __('home.Custom domain'),
            EntitlementCatalog::ADVANCED_EXPORT => __('home.Advanced export'),
            EntitlementCatalog::GITHUB_IMPORT => __('home.GitHub import'),
        ] as $code => $label) {
            if (($grants[$code]['allowed'] ?? false) === true) {
                $lines[] = $label;
            }
        }

        return $lines;
    }

    private static function amount(?int $ceiling): string
    {
        if ($ceiling === null) {
            return (string) __('home.Unlimited');
        }

        return number_format($ceiling);
    }

    /**
     * @param  array{price_monthly?: float|null, price_yearly?: float|null}  $pack
     */
    private static function priceLabel(?EntitlementPlan $row, array $pack, string $interval = 'monthly'): string
    {
        if ($row instanceof EntitlementPlan) {
            $line = $row->formatPrice($interval);
            if ($line !== '—') {
                return $line;
            }
        }

        $amount = $interval === 'yearly'
            ? ($pack['price_yearly'] ?? $pack['price_monthly'] ?? null)
            : ($pack['price_monthly'] ?? null);

        if ($amount === 0 || $amount === 0.0) {
            return Money::format(0);
        }

        return (string) __('home.Custom');
    }

    private static function hint(string $slug): string
    {
        return match ($slug) {
            'free' => (string) __('home.Free for 14 days of Lab credits on the default pack — then the monthly pool applies.'),
            'pro' => (string) __('home.per month'),
            default => (string) __('home.tailored to the bench'),
        };
    }

    private static function cta(string $slug): string
    {
        return match ($slug) {
            'free' => (string) __('home.Start free'),
            'pro' => (string) __('home.Choose Pro'),
            default => (string) __('home.Talk to us'),
        };
    }
}
