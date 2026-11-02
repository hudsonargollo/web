<x-settings.frame section="usage">
    <div class="space-y-8">
        <div>
            <h1 class="text-2xl font-semibold tracking-tight text-krikkit-fg">{{ __('settings.Usage') }}</h1>
            <p class="mt-1 text-sm text-krikkit-muted">{{ __('settings.How Lab credits and tokens have been used on your projects.') }}</p>
        </div>

        @if ($snapshot['credits'] ?? null)
            <krikkit:card class="grid gap-4 sm:grid-cols-3">
                <div>
                    <p class="text-[11px] font-semibold uppercase tracking-[0.14em] text-krikkit-subtle">{{ __('settings.Used') }}</p>
                    <p class="mt-1 text-lg font-semibold text-krikkit-fg">{{ $snapshot['credits']['unlimited'] ? '—' : number_format((int) $snapshot['credits']['used']) }}</p>
                </div>
                <div>
                    <p class="text-[11px] font-semibold uppercase tracking-[0.14em] text-krikkit-subtle">{{ __('settings.Remaining') }}</p>
                    <p class="mt-1 text-lg font-semibold text-krikkit-fg">{{ $snapshot['credits']['unlimited'] ? __('settings.Unlimited credits') : number_format((int) ($snapshot['credits']['remaining'] ?? 0)) }}</p>
                </div>
                <div>
                    <p class="text-[11px] font-semibold uppercase tracking-[0.14em] text-krikkit-subtle">{{ __('settings.Projects') }}</p>
                    <p class="mt-1 text-lg font-semibold text-krikkit-fg">{{ number_format((int) ($snapshot['quotas']['projects']['used'] ?? 0)) }}</p>
                </div>
            </krikkit:card>
        @endif

        <div>
            <p class="mb-3 text-sm font-medium text-krikkit-muted">{{ __('settings.Projects') }}</p>
            @if ($ledger['projects'] === [])
                <p class="text-sm text-krikkit-muted">{{ __('settings.No usage yet.') }}</p>
            @else
                <krikkit:table>
                    <krikkit:table.columns>
                        <krikkit:table.column>{{ __('settings.Projects') }}</krikkit:table.column>
                        <krikkit:table.column>{{ __('settings.Credits') }}</krikkit:table.column>
                        <krikkit:table.column>{{ __('settings.When') }}</krikkit:table.column>
                    </krikkit:table.columns>
                    <krikkit:table.rows>
                        @foreach ($ledger['projects'] as $project)
                            <krikkit:table.row>
                                <krikkit:table.cell>
                                    <a href="{{ route('lab.show', $project['uuid']) }}" class="text-sm font-medium text-krikkit-fg hover:text-accent-content">{{ $project['title'] }}</a>
                                </krikkit:table.cell>
                                <krikkit:table.cell>{{ number_format((int) $project['credits']) }}</krikkit:table.cell>
                                <krikkit:table.cell>{{ $project['updated'] }}</krikkit:table.cell>
                            </krikkit:table.row>
                        @endforeach
                    </krikkit:table.rows>
                </krikkit:table>
            @endif
        </div>

        <div>
            <p class="mb-3 text-sm font-medium text-krikkit-muted">{{ __('settings.Models') }}</p>
            @if ($ledger['models'] === [])
                <p class="text-sm text-krikkit-muted">{{ __('settings.No usage yet.') }}</p>
            @else
                <krikkit:table>
                    <krikkit:table.columns>
                        <krikkit:table.column>{{ __('settings.Models') }}</krikkit:table.column>
                        <krikkit:table.column>{{ __('settings.Credits') }}</krikkit:table.column>
                        <krikkit:table.column>{{ __('settings.Turns') }}</krikkit:table.column>
                        <krikkit:table.column>{{ __('settings.Input tokens') }}</krikkit:table.column>
                        <krikkit:table.column>{{ __('settings.Output tokens') }}</krikkit:table.column>
                    </krikkit:table.columns>
                    <krikkit:table.rows>
                        @foreach ($ledger['models'] as $row)
                            <krikkit:table.row>
                                <krikkit:table.cell>{{ $row['model'] }}</krikkit:table.cell>
                                <krikkit:table.cell>{{ number_format((int) $row['credits']) }}</krikkit:table.cell>
                                <krikkit:table.cell>{{ number_format((int) $row['turns']) }}</krikkit:table.cell>
                                <krikkit:table.cell>{{ number_format((int) $row['input_tokens']) }}</krikkit:table.cell>
                                <krikkit:table.cell>{{ number_format((int) $row['output_tokens']) }}</krikkit:table.cell>
                            </krikkit:table.row>
                        @endforeach
                    </krikkit:table.rows>
                </krikkit:table>
            @endif
        </div>
    </div>
</x-settings.frame>
