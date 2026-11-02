<?php

namespace App\Support\Navigation;

use App\Datastore\DatastoreKind;
use App\Models\User;
use App\Visuals\VisualCatalog;

final class WorkspaceNav
{
    /**
     * @return list<array{
     *     label: string,
     *     route: string|null,
     *     ability: string|null,
     *     group: string,
     *     icon: string,
     *     children?: list<array{label: string, route: string, ability: string, icon?: string}>
     * }>
     */
    public static function catalog(): array
    {
        return [
            [
                'label' => __('dashboard.Overview'),
                'route' => 'dashboard.home',
                'ability' => 'dashboard.access',
                'group' => __('dashboard.Workspace'),
                'icon' => 'home',
            ],
            [
                'label' => __('dashboard.Users'),
                'route' => 'dashboard.users.index',
                'ability' => 'users.browse',
                'group' => __('dashboard.Workspace'),
                'icon' => 'users',
            ],
            [
                'label' => __('dashboard.Roles'),
                'route' => 'dashboard.roles.index',
                'ability' => 'roles.browse',
                'group' => __('dashboard.Workspace'),
                'icon' => 'identification',
            ],
            [
                'label' => __('dashboard.Lab'),
                'route' => 'dashboard.lab.index',
                'ability' => 'projects.browse',
                'group' => __('dashboard.Workspace'),
                'icon' => 'lab',
            ],
            [
                'label' => __('dashboard.Usage'),
                'route' => 'dashboard.lab.usage',
                'ability' => 'projects.browse',
                'group' => __('dashboard.Workspace'),
                'icon' => 'chart-bar',
            ],
            [
                'label' => __('dashboard.Failed turns'),
                'route' => 'dashboard.lab.turns',
                'ability' => 'projects.browse',
                'group' => __('dashboard.Workspace'),
                'icon' => 'exclamation-triangle',
            ],
            [
                'label' => __('dashboard.Packs'),
                'route' => 'dashboard.packs.index',
                'ability' => 'packs.browse',
                'group' => __('dashboard.Workspace'),
                'icon' => 'cube',
            ],
            [
                'label' => __('dashboard.Credits'),
                'route' => 'dashboard.credits.index',
                'ability' => 'finance.browse',
                'group' => __('dashboard.Workspace'),
                'icon' => 'circle-stack',
            ],
            [
                'label' => __('dashboard.Finance'),
                'route' => null,
                'ability' => null,
                'group' => __('dashboard.Workspace'),
                'icon' => 'currency-dollar',
                'children' => [
                    [
                        'label' => __('dashboard.Overview'),
                        'route' => 'dashboard.finance.index',
                        'ability' => 'finance.browse',
                    ],
                    [
                        'label' => __('dashboard.Subscriptions'),
                        'route' => 'dashboard.finance.subscriptions.index',
                        'ability' => 'finance.browse',
                    ],
                    [
                        'label' => __('dashboard.Events'),
                        'route' => 'dashboard.finance.events.index',
                        'ability' => 'finance.browse',
                    ],
                ],
            ],
            [
                'label' => __('dashboard.Payment Methods'),
                'route' => 'dashboard.payments.index',
                'ability' => 'payments.revise',
                'group' => __('dashboard.Workspace'),
                'icon' => 'credit-card',
            ],
            [
                'label' => __('dashboard.Blog'),
                'route' => 'dashboard.blog.index',
                'ability' => 'blog.browse',
                'group' => __('dashboard.Workspace'),
                'icon' => 'newspaper',
            ],
            [
                'label' => __('dashboard.Pages'),
                'route' => 'dashboard.pages.index',
                'ability' => 'pages.browse',
                'group' => __('dashboard.Workspace'),
                'icon' => 'document-text',
            ],
            [
                'label' => __('dashboard.Languages'),
                'route' => 'dashboard.languages.index',
                'ability' => 'languages.browse',
                'group' => __('dashboard.Workspace'),
                'icon' => 'language',
            ],
            [
                'label' => __('dashboard.API Integration'),
                'route' => null,
                'ability' => null,
                'group' => __('dashboard.Workspace'),
                'icon' => 'sparkles',
                'children' => self::integrationChildren(),
            ],
            [
                'label' => __('dashboard.Sessions'),
                'route' => 'dashboard.sessions.index',
                'ability' => 'sessions.browse',
                'group' => __('dashboard.Workspace'),
                'icon' => 'computer-desktop',
            ],
            [
                'label' => __('dashboard.Invoices'),
                'route' => 'dashboard.invoices.index',
                'ability' => 'finance.browse',
                'group' => __('dashboard.Workspace'),
                'icon' => 'receipt-percent',
            ],
            [
                'label' => __('dashboard.Landing page'),
                'route' => 'dashboard.landing.index',
                'ability' => 'settings.revise',
                'group' => __('dashboard.Workspace'),
                'icon' => 'globe-alt',
            ],
            [
                'label' => __('dashboard.Newsletter'),
                'route' => 'dashboard.newsletter.index',
                'ability' => 'settings.revise',
                'group' => __('dashboard.Workspace'),
                'icon' => 'envelope',
            ],
            [
                'label' => __('dashboard.Contacts'),
                'route' => 'dashboard.contacts.index',
                'ability' => 'contacts.browse',
                'group' => __('dashboard.Workspace'),
                'icon' => 'inbox',
            ],
            [
                'label' => __('dashboard.SEO'),
                'route' => 'dashboard.seo.index',
                'ability' => 'settings.revise',
                'group' => __('dashboard.Workspace'),
                'icon' => 'magnifying-glass',
            ],
            [
                'label' => __('dashboard.Settings'),
                'route' => null,
                'ability' => null,
                'group' => __('dashboard.Workspace'),
                'icon' => 'cog-6-tooth',
                'children' => [
                    [
                        'label' => __('dashboard.General'),
                        'route' => 'dashboard.settings.index',
                        'ability' => 'settings.revise',
                    ],
                    [
                        'label' => __('dashboard.Themes'),
                        'route' => 'dashboard.settings.themes',
                        'ability' => 'settings.revise',
                    ],
                    [
                        'label' => __('dashboard.Mail'),
                        'route' => 'dashboard.settings.mail',
                        'ability' => 'settings.revise',
                    ],
                    [
                        'label' => __('dashboard.License'),
                        'route' => 'dashboard.settings.license',
                        'ability' => 'settings.revise',
                    ],
                    [
                        'label' => __('dashboard.Publish settings'),
                        'route' => 'dashboard.settings.publish',
                        'ability' => 'settings.revise',
                    ],
                    [
                        'label' => __('dashboard.Lab console'),
                        'route' => 'dashboard.settings.lab',
                        'ability' => 'settings.revise',
                    ],
                    [
                        'label' => __('dashboard.GDPR'),
                        'route' => 'dashboard.settings.gdpr',
                        'ability' => 'settings.revise',
                    ],
                    [
                        'label' => __('dashboard.Privacy policy'),
                        'route' => 'dashboard.settings.privacy',
                        'ability' => 'settings.revise',
                    ],
                    [
                        'label' => __('dashboard.Terms'),
                        'route' => 'dashboard.settings.terms',
                        'ability' => 'settings.revise',
                    ],
                ],
            ],
        ];
    }

    /**
     * @return list<array{label: string, route: string, route_params?: array<string, string>, ability: string}>
     */
    private static function integrationChildren(): array
    {
        $children = [];

        foreach (config('ai.providers', []) as $key => $config) {
            $children[] = [
                'label' => (string) ($config['label'] ?? $key),
                'route' => 'dashboard.integration.edit',
                'route_params' => ['provider' => (string) $key],
                'ability' => 'ai.revise',
            ];
        }

        $children[] = [
            'label' => (string) __('dashboard.GitHub'),
            'route' => 'dashboard.integration.edit',
            'route_params' => ['provider' => 'github'],
            'ability' => 'ai.revise',
        ];

        foreach (app(VisualCatalog::class)->all() as $catalogId => $config) {
            $children[] = [
                'label' => (string) ($config['label'] ?? $catalogId),
                'route' => 'dashboard.integration.edit',
                'route_params' => ['provider' => (string) $catalogId],
                'ability' => 'ai.revise',
            ];
        }

        foreach (app(DatastoreKind::class)->all() as $kind => $config) {
            $children[] = [
                'label' => (string) ($config['label'] ?? $kind),
                'route' => 'dashboard.integration.edit',
                'route_params' => ['provider' => (string) $kind],
                'ability' => 'ai.revise',
            ];
        }

        return $children;
    }

    /**
     * @return array<string, list<array{
     *     label: string,
     *     route: string|null,
     *     ability: string|null,
     *     group: string,
     *     icon: string,
     *     children?: list<array{label: string, route: string, route_params?: array<string, string>, ability: string, icon?: string}>
     * }>>
     */
    public static function visibleGroups(?User $user): array
    {
        if ($user === null) {
            return [];
        }

        return collect(self::catalog())
            ->map(function (array $item) use ($user) {
                $children = collect($item['children'] ?? [])
                    ->filter(fn (array $child) => $user->allows($child['ability']))
                    ->values()
                    ->all();

                $item['children'] = $children;

                return $item;
            })
            ->filter(function (array $item) use ($user) {
                $parentAllowed = filled($item['ability']) && $user->allows($item['ability']);

                return $parentAllowed || count($item['children']) > 0;
            })
            ->groupBy('group')
            ->all();
    }

    /**
     * @param  array<string, string>  $params
     */
    public static function routeIsActive(string $route, array $params = []): bool
    {
        if ($route === 'dashboard.integration.edit') {
            return request()->routeIs('dashboard.integration.edit')
                && (string) request()->route('provider') === (string) ($params['provider'] ?? '');
        }

        if (request()->routeIs($route)) {
            return true;
        }

        if ($route === 'dashboard.sessions.index' && request()->routeIs('dashboard.users.sessions')) {
            return true;
        }

        if ($route === 'dashboard.profile.index') {
            return request()->routeIs('dashboard.profile.*');
        }

        if ($route === 'dashboard.settings.index') {
            return request()->routeIs('dashboard.settings.index');
        }

        if ($route === 'dashboard.lab.index') {
            return request()->routeIs('dashboard.lab.index', 'dashboard.lab.show');
        }

        if ($route === 'dashboard.users.index') {
            return request()->routeIs('dashboard.users.index', 'dashboard.users.create', 'dashboard.users.edit');
        }

        if ($route === 'dashboard.payments.index') {
            return request()->routeIs('dashboard.payments.index', 'dashboard.payments.edit');
        }

        if ($route === 'dashboard.finance.index') {
            return request()->routeIs('dashboard.finance.index');
        }

        if ($route === 'dashboard.integration.index') {
            return request()->routeIs('dashboard.integration.index', 'dashboard.integration.edit');
        }

        if (str_ends_with($route, '.index') && request()->routeIs(str_replace('.index', '.*', $route))) {
            return true;
        }

        if (request()->routeIs($route.'.*')) {
            return true;
        }

        return false;
    }
}
