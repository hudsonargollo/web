<div class="space-y-8">
    <div>
        <h1 class="text-lg font-semibold tracking-tight text-krikkit-fg">{{ __('dashboard.Payment Methods') }}</h1>
        <p class="mt-0.5 text-xs text-krikkit-muted">{{ __('dashboard.Connect Stripe and PayPal. Keys stay on this workspace.') }}</p>
    </div>

    <krikkit:table>
        <krikkit:table.columns>
            <krikkit:table.column>{{ __('dashboard.Method') }}</krikkit:table.column>
            <krikkit:table.column>{{ __('dashboard.Mode') }}</krikkit:table.column>
            <krikkit:table.column>{{ __('dashboard.Keys') }}</krikkit:table.column>
            <krikkit:table.column>{{ __('dashboard.Status') }}</krikkit:table.column>
            <krikkit:table.column align="right"></krikkit:table.column>
        </krikkit:table.columns>
        <krikkit:table.rows>
            @foreach ($gateways as $gateway)
                <krikkit:table.row>
                    <krikkit:table.cell>
                        <p class="text-xs font-medium text-krikkit-fg">{{ $gateway['title'] }}</p>
                        <p class="mt-0.5 text-[11px] text-krikkit-muted">{{ __("dashboard.{$gateway['summary']}") }}</p>
                    </krikkit:table.cell>
                    <krikkit:table.cell>
                        <span class="text-krikkit-muted">
                            {{ $gateway['mode'] === 'live' ? __('dashboard.Live') : __('dashboard.Test') }}
                        </span>
                    </krikkit:table.cell>
                    <krikkit:table.cell>
                        <span class="text-krikkit-fg-soft">
                            @if ($gateway['source'] === 'workspace')
                                {{ __('dashboard.Configured') }}
                            @elseif ($gateway['source'] === 'env')
                                {{ __('dashboard.Using .env') }}
                            @else
                                {{ __('dashboard.Not configured') }}
                            @endif
                        </span>
                    </krikkit:table.cell>
                    <krikkit:table.cell>
                        <div class="flex flex-wrap items-center gap-1">
                            @if ($gateway['ready'])
                                <krikkit:badge color="teal" size="xs">{{ __('dashboard.Ready') }}</krikkit:badge>
                            @elseif ($gateway['enabled'])
                                <krikkit:badge color="amber" size="xs">{{ __('dashboard.Needs keys') }}</krikkit:badge>
                            @else
                                <krikkit:badge size="xs">{{ __('dashboard.Off') }}</krikkit:badge>
                            @endif
                        </div>
                    </krikkit:table.cell>
                    <krikkit:table.cell align="right">
                        <krikkit:button
                            href="{{ route('dashboard.payments.edit', $gateway['driver']) }}"
                            variant="ghost"
                            square
                            size="sm"
                            aria-label="{{ __('dashboard.Edit') }}"
                            title="{{ __('dashboard.Edit') }}"
                        >
                            <krikkit:icon name="pencil" class="size-4" />
                        </krikkit:button>
                    </krikkit:table.cell>
                </krikkit:table.row>
            @endforeach
        </krikkit:table.rows>
    </krikkit:table>
</div>
