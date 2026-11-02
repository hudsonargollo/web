<?php

namespace App\Entitlement;

/**
 * Default pack matrix. Ceiling null = unlimited.
 */
final class PlanBlueprint
{
    /**
     * @return list<array{
     *     slug: string,
     *     title: string,
     *     summary: string,
     *     rank: int,
     *     price_monthly?: float|null,
     *     price_yearly?: float|null,
     *     is_default: bool,
     *     grants: array<string, array{allowed?: bool, ceiling?: int|null, window?: UsageWindow}>
     * }>
     */
    public static function packs(): array
    {
        return [
            [
                'slug' => 'free',
                'title' => 'Free',
                'summary' => 'A small project allowance and monthly Lab credits.',
                'rank' => 10,
                'price_monthly' => 0,
                'price_yearly' => 0,
                'is_default' => true,
                'grants' => [
                    EntitlementCatalog::PROJECTS => ['ceiling' => 3, 'window' => UsageWindow::Lifetime],
                    EntitlementCatalog::LAB_CREDITS => ['ceiling' => 100, 'window' => UsageWindow::Monthly],
                    EntitlementCatalog::CUSTOM_SUBDOMAIN => ['allowed' => false],
                    EntitlementCatalog::CUSTOM_DOMAIN => ['allowed' => false],
                    EntitlementCatalog::ADVANCED_EXPORT => ['allowed' => false],
                    EntitlementCatalog::GITHUB_IMPORT => ['allowed' => false],
                ],
            ],
            [
                'slug' => 'pro',
                'title' => 'Pro',
                'summary' => 'More projects, a larger Lab credit pool, and unlocked extras.',
                'rank' => 20,
                'price_monthly' => 29,
                'price_yearly' => 290,
                'is_default' => false,
                'grants' => [
                    EntitlementCatalog::PROJECTS => ['ceiling' => 25, 'window' => UsageWindow::Lifetime],
                    EntitlementCatalog::LAB_CREDITS => ['ceiling' => 2500, 'window' => UsageWindow::Monthly],
                    EntitlementCatalog::CUSTOM_SUBDOMAIN => ['allowed' => true],
                    EntitlementCatalog::CUSTOM_DOMAIN => ['allowed' => true],
                    EntitlementCatalog::ADVANCED_EXPORT => ['allowed' => true],
                    EntitlementCatalog::GITHUB_IMPORT => ['allowed' => true],
                ],
            ],
            [
                'slug' => 'agency',
                'title' => 'Agency',
                'summary' => 'Unlimited projects and Lab credits for agencies and enterprise teams.',
                'rank' => 30,
                'is_default' => false,
                'grants' => [
                    EntitlementCatalog::PROJECTS => ['ceiling' => null, 'window' => UsageWindow::Lifetime],
                    EntitlementCatalog::LAB_CREDITS => ['ceiling' => null, 'window' => UsageWindow::Monthly],
                    EntitlementCatalog::CUSTOM_SUBDOMAIN => ['allowed' => true],
                    EntitlementCatalog::CUSTOM_DOMAIN => ['allowed' => true],
                    EntitlementCatalog::ADVANCED_EXPORT => ['allowed' => true],
                    EntitlementCatalog::GITHUB_IMPORT => ['allowed' => true],
                ],
            ],
        ];
    }
}
