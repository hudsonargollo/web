<div class="space-y-8">
    <div>
        <h1 class="text-lg font-semibold tracking-tight text-krikkit-fg">{{ __('dashboard.API Integration') }}</h1>
        <p class="mt-0.5 text-xs text-krikkit-muted">
            {{ __('dashboard.Default model, provider keys, GitHub OAuth, photograph catalogs, and the Lab datastore.') }}
        </p>
    </div>

    @include('livewire.dashboard.integration.options.defaults')

    @if (count($providers) === 0)
        <p class="text-sm text-krikkit-muted">{{ __('dashboard.No providers configured.') }}</p>
    @else
        <krikkit:table>
            <krikkit:table.columns>
                <krikkit:table.column>{{ __('dashboard.Provider') }}</krikkit:table.column>
                <krikkit:table.column>{{ __('dashboard.Models') }}</krikkit:table.column>
                <krikkit:table.column>{{ __('dashboard.API key') }}</krikkit:table.column>
                <krikkit:table.column>{{ __('dashboard.Status') }}</krikkit:table.column>
                <krikkit:table.column align="right"></krikkit:table.column>
            </krikkit:table.columns>
            <krikkit:table.rows>
                @foreach ($providers as $provider)
                    <krikkit:table.row>
                        <krikkit:table.cell>
                            <p class="text-xs font-medium text-krikkit-fg">{{ $provider['label'] }}</p>
                        </krikkit:table.cell>
                        <krikkit:table.cell>
                            <span class="text-krikkit-muted">
                                {{ $provider['models_label'] ?? count($provider['models']) }}
                            </span>
                        </krikkit:table.cell>
                        <krikkit:table.cell>
                            <span class="text-krikkit-fg-soft">
                                @if (in_array($provider['id'], ['github', 'supabase'], true))
                                    @if ($provider['source'] === 'workspace')
                                        {{ __('dashboard.Configured') }}
                                    @elseif ($provider['source'] === 'env')
                                        {{ __('dashboard.Using .env') }}
                                    @else
                                        {{ __('dashboard.Not configured') }}
                                    @endif
                                @elseif ($provider['source'] === 'workspace')
                                    {{ __('dashboard.workspace key :masked', ['masked' => $provider['masked']]) }}
                                @elseif ($provider['source'] === 'env')
                                    {{ __('dashboard..env fallback :masked', ['masked' => $provider['masked']]) }}
                                @else
                                    {{ __('dashboard.no key') }}
                                @endif
                            </span>
                        </krikkit:table.cell>
                        <krikkit:table.cell>
                            <div class="flex flex-wrap items-center gap-1">
                                @if ($provider['enabled'])
                                    <krikkit:badge color="teal" size="xs">{{ __('dashboard.On') }}</krikkit:badge>
                                @else
                                    <krikkit:badge size="xs">{{ __('dashboard.Off') }}</krikkit:badge>
                                @endif
                                @if ($provider['source'] === 'missing')
                                    <krikkit:badge color="amber" size="xs">
                                        {{ in_array($provider['id'], ['github', 'supabase'], true) ? __('dashboard.Not configured') : __('dashboard.Needs key') }}
                                    </krikkit:badge>
                                @endif
                            </div>
                        </krikkit:table.cell>
                        <krikkit:table.cell align="right">
                            <krikkit:button
                                href="{{ route('dashboard.integration.edit', $provider['id']) }}"
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
    @endif
</div>
