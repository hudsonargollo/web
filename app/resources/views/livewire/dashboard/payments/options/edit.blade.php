<div class="space-y-6">
    <div class="flex items-center gap-3">
        <krikkit:button
            href="{{ route('dashboard.payments.index') }}"
            variant="ghost"
            square
            size="sm"
            aria-label="{{ __('dashboard.Back') }}"
            title="{{ __('dashboard.Back') }}"
        >
            <krikkit:icon name="arrow-left" class="size-4" />
        </krikkit:button>
        <h1 class="text-2xl font-semibold tracking-tight text-krikkit-fg">{{ $definition['title'] }}</h1>
    </div>

    <form wire:submit="save" class="mx-auto max-w-2xl space-y-6" autocomplete="off">
        <div class="sr-only" aria-hidden="true">
            <input type="text" name="prevent_autofill_user" autocomplete="username" tabindex="-1" value="">
            <input type="password" name="prevent_autofill_pass" autocomplete="current-password" tabindex="-1" value="">
        </div>

        @if ($row['unreadable'] ?? false)
            <krikkit:callout tone="warning">
                <krikkit:callout.heading>{{ __('dashboard.Saved key cannot be read') }}</krikkit:callout.heading>
                <krikkit:callout.text>{{ __('dashboard.The saved secret can no longer be read. Paste it again to restore this provider.') }}</krikkit:callout.text>
            </krikkit:callout>
        @endif

        <krikkit:field :label="__('dashboard.'.$definition['public_label'])">
            <krikkit:input
                type="text"
                wire:model="publicKey"
                autocomplete="off"
                autocorrect="off"
                spellcheck="false"
                data-1p-ignore
                data-lpignore="true"
                readonly
                x-on:focus="$el.removeAttribute('readonly')"
                :placeholder="$row['has_public'] ? __('dashboard.•••• keep current') : __('dashboard.'.$definition['public_label'])"
            />
        </krikkit:field>
        @if ($row['has_public'])
            <krikkit:checkbox :label="__('dashboard.Clear stored public key')" wire:model="clearPublic" />
        @endif

        <krikkit:field :label="__('dashboard.'.$definition['secret_label'])">
            <krikkit:input
                type="password"
                wire:model="secretKey"
                autocomplete="new-password"
                data-1p-ignore
                data-lpignore="true"
                readonly
                x-on:focus="$el.removeAttribute('readonly')"
                :placeholder="$row['has_secret'] ? __('dashboard.•••• keep current') : __('dashboard.'.$definition['secret_label'])"
            />
        </krikkit:field>
        @if ($row['has_secret'])
            <krikkit:checkbox :label="__('dashboard.Clear stored secret')" wire:model="clearSecret" />
        @endif

        <krikkit:field :label="__('dashboard.'.$definition['webhook_label'])">
            <krikkit:input
                type="password"
                wire:model="webhookSecret"
                autocomplete="new-password"
                data-1p-ignore
                data-lpignore="true"
                readonly
                x-on:focus="$el.removeAttribute('readonly')"
                :placeholder="$row['has_webhook'] ? __('dashboard.•••• keep current') : __('dashboard.'.$definition['webhook_label'])"
            />
        </krikkit:field>
        @if ($row['has_webhook'])
            <krikkit:checkbox :label="__('dashboard.Clear stored webhook secret')" wire:model="clearWebhook" />
        @endif

        <div
            class="space-y-1"
            x-data="{
                copied: false,
                async copy() {
                    try {
                        await navigator.clipboard.writeText(@js($row['webhook_url']))
                        this.copied = true
                        clearTimeout(this._copyTimer)
                        this._copyTimer = setTimeout(() => { this.copied = false }, 1600)
                    } catch (e) {}
                },
            }"
        >
            <p class="text-xs font-medium text-krikkit-fg-soft">{{ __('dashboard.Webhook URL') }}</p>
            <div class="flex min-w-0 items-center gap-2">
                <span class="min-w-0 truncate text-xs text-krikkit-muted">{{ $row['webhook_url'] }}</span>
                <button
                    type="button"
                    class="shrink-0 text-xs font-medium text-krikkit-muted transition hover:text-krikkit-fg"
                    x-on:click="copy()"
                    x-bind:aria-label="copied ? @js(__('dashboard.Copied')) : @js(__('dashboard.Copy'))"
                >
                    <span x-text="copied ? @js(__('dashboard.Copied')) : @js(__('dashboard.Copy'))"></span>
                </button>
            </div>
            <p class="text-xs text-krikkit-muted">{{ __('dashboard.Paste this URL into the provider webhook settings.') }}</p>
        </div>

        <div class="grid grid-cols-2 gap-6 border-t border-krikkit-line pt-4">
            <krikkit:switch align="right" class="w-full justify-between" :label="__('dashboard.Enabled')" wire:model="enabled" />
            <krikkit:switch align="right" class="w-full justify-between" :label="__('dashboard.Live mode')" wire:model="live" />
        </div>

        <div class="flex justify-end">
            <krikkit:button type="submit" wire:loading.attr="disabled">
                {{ __('dashboard.Save changes') }}
            </krikkit:button>
        </div>
    </form>
</div>
