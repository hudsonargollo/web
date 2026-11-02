<krikkit:table>
    <krikkit:table.columns>
        <krikkit:table.column>{{ __('dashboard.Project') }}</krikkit:table.column>
        <krikkit:table.column>{{ __('dashboard.Owner') }}</krikkit:table.column>
        <krikkit:table.column>{{ __('dashboard.Status') }}</krikkit:table.column>
        <krikkit:table.column>{{ __('dashboard.Updated') }}</krikkit:table.column>
    </krikkit:table.columns>
    <krikkit:table.rows>
        @foreach ($rows as $message)
            @php
                $project = $message->project;
                $status = \App\Lab\LabTurnHealth::statusLabel($message, $kind);
            @endphp
            <krikkit:table.row>
                <krikkit:table.cell>
                    @if ($project)
                        <a href="{{ route('dashboard.lab.show', $project) }}" wire:navigate class="text-xs font-medium text-krikkit-fg hover:underline">
                            {{ $project->title ?: __('dashboard.Untitled') }}
                        </a>
                    @else
                        <span class="text-krikkit-muted">—</span>
                    @endif
                </krikkit:table.cell>
                <krikkit:table.cell>
                    <span class="text-xs text-krikkit-muted">{{ $project?->user?->name ?: __('dashboard.Unassigned') }}</span>
                </krikkit:table.cell>
                <krikkit:table.cell>
                    <krikkit:badge size="xs" :color="$kind === 'stuck' ? 'amber' : 'red'">{{ $status }}</krikkit:badge>
                </krikkit:table.cell>
                <krikkit:table.cell>
                    <span class="text-krikkit-muted">{{ $message->updated_at?->diffForHumans() }}</span>
                </krikkit:table.cell>
            </krikkit:table.row>
        @endforeach
    </krikkit:table.rows>
</krikkit:table>
