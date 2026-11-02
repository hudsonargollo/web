<div class="space-y-8">
    <div>
        <h1 class="text-lg font-semibold tracking-tight text-krikkit-fg">{{ __('dashboard.Usage') }}</h1>
        <p class="mt-0.5 text-xs text-krikkit-muted">{{ __('dashboard.Credits spent by user, project, and model.') }}</p>
    </div>

    <nav class="flex flex-wrap gap-1" aria-label="{{ __('dashboard.Usage') }}">
        @foreach ([
            'user' => __('dashboard.User'),
            'project' => __('dashboard.Project'),
            'model' => __('dashboard.Model'),
        ] as $key => $label)
            <button
                type="button"
                wire:click="showFacet(@js($key))"
                @class([
                    'rounded-full border px-3 py-1 text-xs transition',
                    'border-krikkit-fg bg-krikkit-soft text-krikkit-fg' => $facet === $key,
                    'border-krikkit-line text-krikkit-muted hover:text-krikkit-fg' => $facet !== $key,
                ])
            >
                {{ $label }}
            </button>
        @endforeach
    </nav>

    @if ($facet === 'user')
        @if ($byUser === [])
            <p class="text-sm text-krikkit-muted">{{ __('dashboard.No Lab usage yet.') }}</p>
        @else
            <krikkit:table>
                <krikkit:table.columns>
                    <krikkit:table.column>{{ __('dashboard.User') }}</krikkit:table.column>
                    <krikkit:table.column align="right">{{ __('dashboard.Projects') }}</krikkit:table.column>
                    <krikkit:table.column align="right">{{ __('dashboard.Credits') }}</krikkit:table.column>
                </krikkit:table.columns>
                <krikkit:table.rows>
                    @foreach ($byUser as $row)
                        <krikkit:table.row>
                            <krikkit:table.cell>
                                @if ($row['user'])
                                    <p class="text-xs text-krikkit-fg">{{ $row['user']->name }}</p>
                                    <p class="text-[11px] text-krikkit-muted">{{ $row['user']->email }}</p>
                                @else
                                    <span class="text-krikkit-muted">{{ __('dashboard.Unassigned') }}</span>
                                @endif
                            </krikkit:table.cell>
                            <krikkit:table.cell align="right">
                                <span class="tabular-nums">{{ number_format($row['projects']) }}</span>
                            </krikkit:table.cell>
                            <krikkit:table.cell align="right">
                                <span class="tabular-nums text-krikkit-fg">{{ number_format($row['credits']) }}</span>
                            </krikkit:table.cell>
                        </krikkit:table.row>
                    @endforeach
                </krikkit:table.rows>
            </krikkit:table>
        @endif
    @elseif ($facet === 'project')
        @if ($byProject === [])
            <p class="text-sm text-krikkit-muted">{{ __('dashboard.No Lab usage yet.') }}</p>
        @else
            <krikkit:table>
                <krikkit:table.columns>
                    <krikkit:table.column>{{ __('dashboard.Project') }}</krikkit:table.column>
                    <krikkit:table.column>{{ __('dashboard.Owner') }}</krikkit:table.column>
                    <krikkit:table.column align="right">{{ __('dashboard.Credits') }}</krikkit:table.column>
                </krikkit:table.columns>
                <krikkit:table.rows>
                    @foreach ($byProject as $project)
                        <krikkit:table.row>
                            <krikkit:table.cell>
                                <a href="{{ route('dashboard.lab.show', $project) }}" wire:navigate class="text-xs font-medium text-krikkit-fg hover:underline">
                                    {{ $project->title ?: __('dashboard.Untitled') }}
                                </a>
                            </krikkit:table.cell>
                            <krikkit:table.cell>
                                <span class="text-xs text-krikkit-muted">{{ $project->user?->name ?: __('dashboard.Unassigned') }}</span>
                            </krikkit:table.cell>
                            <krikkit:table.cell align="right">
                                <span class="tabular-nums text-krikkit-fg">{{ number_format((int) $project->credits_spent) }}</span>
                            </krikkit:table.cell>
                        </krikkit:table.row>
                    @endforeach
                </krikkit:table.rows>
            </krikkit:table>
        @endif
    @else
        @if ($byModel === [])
            <p class="text-sm text-krikkit-muted">{{ __('dashboard.No model usage recorded yet.') }}</p>
        @else
            <krikkit:table>
                <krikkit:table.columns>
                    <krikkit:table.column>{{ __('dashboard.Model') }}</krikkit:table.column>
                    <krikkit:table.column align="right">{{ __('dashboard.Turns') }}</krikkit:table.column>
                    <krikkit:table.column align="right">{{ __('dashboard.Credits') }}</krikkit:table.column>
                    <krikkit:table.column align="right">{{ __('dashboard.Tokens') }}</krikkit:table.column>
                </krikkit:table.columns>
                <krikkit:table.rows>
                    @foreach ($byModel as $row)
                        <krikkit:table.row>
                            <krikkit:table.cell>
                                <span class="text-xs text-krikkit-fg">{{ $row['model'] }}</span>
                            </krikkit:table.cell>
                            <krikkit:table.cell align="right">
                                <span class="tabular-nums">{{ number_format($row['turns']) }}</span>
                            </krikkit:table.cell>
                            <krikkit:table.cell align="right">
                                <span class="tabular-nums text-krikkit-fg">{{ number_format($row['credits']) }}</span>
                            </krikkit:table.cell>
                            <krikkit:table.cell align="right">
                                <span class="tabular-nums text-krikkit-muted">{{ number_format($row['input_tokens'] + $row['output_tokens']) }}</span>
                            </krikkit:table.cell>
                        </krikkit:table.row>
                    @endforeach
                </krikkit:table.rows>
            </krikkit:table>
        @endif
    @endif
</div>
