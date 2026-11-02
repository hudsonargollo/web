<div class="space-y-8">
    <div class="flex items-center gap-3">
        <krikkit:button
            href="{{ route('dashboard.sessions.index') }}"
            variant="ghost"
            square
            size="sm"
            aria-label="{{ __('dashboard.Back') }}"
            title="{{ __('dashboard.Back') }}"
        >
            <krikkit:icon name="arrow-left" class="size-4" />
        </krikkit:button>
        <div>
            <h1 class="text-lg font-semibold tracking-tight text-krikkit-fg">{{ __('dashboard.Sessions') }}</h1>
            <p class="mt-0.5 text-xs text-krikkit-muted">{{ $user->email }}</p>
        </div>
    </div>

    @if ($sessions->isEmpty())
        <p class="text-sm text-krikkit-muted">{{ __('dashboard.No active sessions.') }}</p>
    @else
        <krikkit:table>
            <krikkit:table.columns>
                <krikkit:table.column>{{ __('dashboard.Connection') }}</krikkit:table.column>
                <krikkit:table.column>{{ __('dashboard.Last activity') }}</krikkit:table.column>
            </krikkit:table.columns>
            <krikkit:table.rows>
                @foreach ($sessions as $row)
                    @php
                        $agent = filled($row->user_agent) ? $row->user_agent : '—';
                        $isCurrent = $row->isCurrent();
                    @endphp
                    <krikkit:table.row>
                        <krikkit:table.cell>
                            <div class="min-w-0 max-w-md">
                                <p class="truncate text-xs text-krikkit-fg" title="{{ $agent }}">{{ $agent }}</p>
                                @if (filled($row->ip_address))
                                    <p class="truncate text-[11px] text-krikkit-muted">{{ $row->ip_address }}</p>
                                @endif
                            </div>
                        </krikkit:table.cell>
                        <krikkit:table.cell>
                            <div class="flex flex-col gap-1">
                                <span class="text-krikkit-muted">{{ $row->lastActivityAt()->diffForHumans() }}</span>
                                @if ($isCurrent)
                                    <span class="inline-flex w-fit rounded-md bg-teal-500/15 px-1.5 py-0.5 text-[10px] font-medium text-teal-700 dark:text-teal-300">
                                        {{ __('dashboard.This device') }}
                                    </span>
                                @endif
                            </div>
                        </krikkit:table.cell>
                    </krikkit:table.row>
                @endforeach
            </krikkit:table.rows>
        </krikkit:table>
    @endif
</div>
