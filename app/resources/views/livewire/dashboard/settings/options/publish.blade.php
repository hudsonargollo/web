<div class="space-y-8">
    <div>
        <h1 class="text-lg font-semibold tracking-tight text-krikkit-fg">{{ __('dashboard.Settings') }}</h1>
        <p class="mt-0.5 text-xs text-krikkit-muted">
            {{ __('dashboard.Where published Lab sites live. Taken from the application URL.') }}
        </p>
    </div>

    @include('livewire.dashboard.settings.options.nav')

    <form wire:submit="save" class="space-y-10">
        <div>
            <krikkit:switch align="right" class="w-full justify-between" :label="__('dashboard.Active')" wire:model="enabled" />
            <p class="mt-1.5 text-sm leading-relaxed text-krikkit-muted">
                {{ __('dashboard.When off, Lab hides Publish and live sites return 404.') }}
            </p>
        </div>

        <krikkit:card :padding="false" class="space-y-4 !border-0">
            <p class="text-[11px] font-normal uppercase tracking-[0.16em] text-krikkit-subtle">{{ __('dashboard.Publish settings') }}</p>

            <krikkit:field :label="__('dashboard.Publish domain')">
                <krikkit:input size="md" :value="$parent" copyable readonly />
                <x-slot:description>
                    {{ __('dashboard.Subdomains become {slug}.:domain. Locked to APP_URL (:url).', ['domain' => $parent, 'url' => $appUrl]) }}
                </x-slot:description>
            </krikkit:field>
        </krikkit:card>

        <krikkit:card :padding="false" class="space-y-3 !border-0">
            <p class="text-[11px] font-normal uppercase tracking-[0.16em] text-krikkit-subtle">{{ __('dashboard.Wildcard DNS') }}</p>
            <p class="text-sm leading-relaxed text-krikkit-muted">
                {{ __('dashboard.Published sites stay on this same Laravel app. Point a wildcard at this server so Host names like acme.:domain reach public/. Krikkit reads the Host header and serves the built files.', ['domain' => $parent]) }}
            </p>
            <div class="rounded-xl border border-krikkit-line bg-krikkit-surface px-3.5 py-3 font-mono text-[12px] leading-relaxed text-krikkit-fg">
                @if ($serverIp !== '')
                    <p>A&nbsp;&nbsp;{{ $parent }}&nbsp;&nbsp;→&nbsp;{{ $serverIp }}</p>
                    <p>A&nbsp;&nbsp;*.{{ $parent }}&nbsp;&nbsp;→&nbsp;{{ $serverIp }}</p>
                @else
                    <p>A&nbsp;&nbsp;{{ $parent }}&nbsp;&nbsp;→&nbsp;{{ __('dashboard.this server') }}</p>
                    <p>A&nbsp;&nbsp;*.{{ $parent }}&nbsp;&nbsp;→&nbsp;{{ __('dashboard.this server') }}</p>
                @endif
            </div>
            <p class="text-sm leading-relaxed text-krikkit-muted">
                {{ __('dashboard.The web server must accept those Hosts (catch-all or ServerAlias) on the same document root. Add a wildcard TLS certificate for :domain. Custom domains CNAME to :cname, then Verify DNS in Lab.', ['domain' => '*.'.$parent, 'cname' => $parent]) }}
            </p>
        </krikkit:card>

        <div class="flex justify-end">
            <krikkit:button type="submit" wire:loading.attr="disabled">
                {{ __('dashboard.Save changes') }}
            </krikkit:button>
        </div>
    </form>
</div>
