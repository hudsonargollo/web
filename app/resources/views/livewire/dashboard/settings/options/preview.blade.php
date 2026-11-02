<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
    <krikkit:card>
        <p class="mb-4 text-sm font-medium text-krikkit-muted">{{ __('dashboard.Buttons') }}</p>
        <div class="flex flex-wrap items-center gap-2">
            <krikkit:button variant="outline">{{ __('dashboard.Button') }}</krikkit:button>
            <krikkit:button variant="primary">{{ __('dashboard.Primary') }}</krikkit:button>
            <krikkit:button variant="fill">{{ __('dashboard.Filled') }}</krikkit:button>
        </div>
    </krikkit:card>

    <krikkit:card>
        <p class="mb-1 text-sm font-semibold text-krikkit-fg">{{ __('dashboard.Select your payment method') }}</p>
        <p class="mb-4 text-xs text-krikkit-muted">{{ __('dashboard.Radio group') }}</p>
        <div class="space-y-3">
            <krikkit:radio name="theme_pay" value="card" :label="__('dashboard.Credit Card')" checked />
            <krikkit:radio name="theme_pay" value="paypal" :label="__('dashboard.Paypal')" />
            <krikkit:radio name="theme_pay" value="bank" :label="__('dashboard.Bank transfer')" />
        </div>
    </krikkit:card>

    <krikkit:card>
        <p class="mb-1 text-sm font-semibold text-krikkit-fg">{{ __('dashboard.Role') }}</p>
        <p class="mb-4 text-xs text-krikkit-muted">{{ __('dashboard.Checklist') }}</p>
        <div class="space-y-3">
            <krikkit:checkbox name="theme_role_admin" checked>
                <span class="block font-medium text-krikkit-fg">{{ __('dashboard.Administrator') }}</span>
                <span class="block text-xs text-krikkit-muted">{{ __('dashboard.Administrator users can perform any action.') }}</span>
            </krikkit:checkbox>
            <krikkit:checkbox name="theme_role_editor">
                <span class="block font-medium text-krikkit-fg">{{ __('dashboard.Editor') }}</span>
                <span class="block text-xs text-krikkit-muted">{{ __('dashboard.Editor users have the ability to read, create, and update.') }}</span>
            </krikkit:checkbox>
            <krikkit:checkbox name="theme_role_viewer">
                <span class="block font-medium text-krikkit-fg">{{ __('dashboard.Viewer') }}</span>
                <span class="block text-xs text-krikkit-muted">{{ __('dashboard.Viewer users only have the ability to read.') }}</span>
            </krikkit:checkbox>
        </div>
    </krikkit:card>

    <krikkit:card>
        <p class="mb-1 text-sm font-semibold text-krikkit-fg">{{ __('dashboard.Communication emails') }}</p>
        <p class="mb-4 text-xs text-krikkit-muted">{{ __('dashboard.Receive emails about your account activity.') }}</p>
        <div class="space-y-3">
            <krikkit:switch name="theme_mail_activity" :label="__('dashboard.Communication emails')" checked />
            <krikkit:switch name="theme_mail_marketing" :label="__('dashboard.Marketing emails')" />
            <krikkit:switch name="theme_mail_social" :label="__('dashboard.Social emails')" />
            <krikkit:switch name="theme_mail_security" :label="__('dashboard.Security emails')" checked />
        </div>
    </krikkit:card>

    <krikkit:card>
        <p class="mb-1 text-sm font-semibold text-krikkit-fg">{{ __('dashboard.Shipping') }}</p>
        <p class="mb-4 text-xs text-krikkit-muted">{{ __('dashboard.Select') }}</p>
        <krikkit:select name="theme_shipping" placeholder="{{ __('dashboard.Choose…') }}">
            <krikkit:select.option value="standard" selected>{{ __('dashboard.Standard · 4–10 business days') }}</krikkit:select.option>
            <krikkit:select.option value="fast">{{ __('dashboard.Fast · 2–5 business days') }}</krikkit:select.option>
            <krikkit:select.option value="next">{{ __('dashboard.Next day · 1 business day') }}</krikkit:select.option>
        </krikkit:select>
    </krikkit:card>

    <krikkit:card>
        <div class="mb-4 flex items-center gap-3">
            <krikkit:avatar name="Acme Inc" />
            <div>
                <p class="text-sm font-semibold text-krikkit-fg">{{ __('dashboard.Acme Inc.') }}</p>
                <p class="text-xs text-krikkit-muted">{{ __('dashboard.Theming Krikkit') }}</p>
            </div>
        </div>
        <krikkit:tabs selected="profile">
            <krikkit:tabs.list class="mb-3 rounded-xl bg-krikkit-soft p-1">
                <krikkit:tabs.tab name="profile">{{ __('dashboard.Profile') }}</krikkit:tabs.tab>
                <krikkit:tabs.tab name="user">{{ __('dashboard.User') }}</krikkit:tabs.tab>
                <krikkit:tabs.tab name="billing">{{ __('dashboard.Billing') }}</krikkit:tabs.tab>
            </krikkit:tabs.list>
            <krikkit:tabs.panel name="profile">
                <p class="text-sm text-krikkit-muted">
                    {{ __('dashboard.Live preview of Krikkit components with your palette.') }}
                </p>
            </krikkit:tabs.panel>
            <krikkit:tabs.panel name="user">
                <p class="text-sm text-krikkit-muted">{{ __('dashboard.User settings go here.') }}</p>
            </krikkit:tabs.panel>
            <krikkit:tabs.panel name="billing">
                <p class="text-sm text-krikkit-muted">{{ __('dashboard.Billing details go here.') }}</p>
            </krikkit:tabs.panel>
        </krikkit:tabs>
        <div class="mt-4">
            <krikkit:button variant="danger" size="sm">{{ __('dashboard.Shut down') }}</krikkit:button>
        </div>
    </krikkit:card>

    <krikkit:card class="sm:col-span-2 xl:col-span-3">
        <p class="mb-4 text-sm font-medium text-krikkit-muted">{{ __('dashboard.More Krikkit') }}</p>
        <div class="flex flex-wrap items-center gap-3">
            <krikkit:badge>{{ __('dashboard.Default') }}</krikkit:badge>
            <krikkit:badge color="teal">{{ __('dashboard.Teal') }}</krikkit:badge>
            <krikkit:badge color="amber">{{ __('dashboard.Amber') }}</krikkit:badge>
            <krikkit:badge color="red">{{ __('dashboard.Red') }}</krikkit:badge>
            <krikkit:progress :value="62" class="max-w-xs" />
            <krikkit:input name="theme_search" placeholder="{{ __('dashboard.Search…') }}" class="max-w-xs" />
            <krikkit:button variant="subtle" size="sm">
                <krikkit:icon name="bell" class="size-4" />
                {{ __('dashboard.Notify') }}
            </krikkit:button>
        </div>
        <div class="mt-4">
            <krikkit:callout>
                <krikkit:callout.heading>{{ __('dashboard.Theme preview') }}</krikkit:callout.heading>
                <krikkit:callout.text>
                    {!! __('dashboard.Base remaps <code class="text-xs">neutral</code>; accent drives primary actions and switches.') !!}
                </krikkit:callout.text>
            </krikkit:callout>
        </div>
    </krikkit:card>
</div>
