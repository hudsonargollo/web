@php
    use App\Finance\FinanceCopy;
@endphp

<x-settings.frame section="credits">
    <div class="space-y-8">
        <div>
            <h1 class="text-2xl font-semibold tracking-tight text-krikkit-fg">{{ __('settings.Credits') }}</h1>
            <p class="mt-1 text-sm text-krikkit-muted">{{ __('settings.Bonus and pack credits added to this account.') }}</p>
        </div>

        <krikkit:card class="space-y-1">
            @if ($credits && ($credits['unlimited'] ?? false))
                <p class="text-sm font-semibold text-krikkit-fg">{{ __('settings.Unlimited credits') }}</p>
            @elseif ($credits)
                <p class="text-sm font-semibold text-krikkit-fg">{{ __('settings.Credits remaining this month') }}</p>
                <p class="text-3xl font-semibold tracking-tight text-krikkit-fg">{{ number_format((int) ($credits['remaining'] ?? 0)) }}</p>
                <p class="text-sm text-krikkit-muted">{{ __('settings.Used') }} {{ number_format((int) ($credits['used'] ?? 0)) }} / {{ number_format((int) ($credits['limit'] ?? 0)) }}</p>
            @endif
        </krikkit:card>

        @if ($grants->isEmpty())
            <p class="text-sm text-krikkit-muted">{{ __('settings.No credit grants yet.') }}</p>
        @else
            <krikkit:table>
                <krikkit:table.columns>
                    <krikkit:table.column>{{ __('settings.Amount') }}</krikkit:table.column>
                    <krikkit:table.column>{{ __('settings.Kind') }}</krikkit:table.column>
                    <krikkit:table.column>{{ __('settings.Reason') }}</krikkit:table.column>
                    <krikkit:table.column>{{ __('settings.When') }}</krikkit:table.column>
                </krikkit:table.columns>
                <krikkit:table.rows>
                    @foreach ($grants as $grant)
                        <krikkit:table.row>
                            <krikkit:table.cell>{{ $grant->amount > 0 ? '+' : '' }}{{ number_format((int) $grant->amount) }}</krikkit:table.cell>
                            <krikkit:table.cell>{{ FinanceCopy::creditKind($grant->kind) }}</krikkit:table.cell>
                            <krikkit:table.cell>{{ $grant->reason ?: '—' }}</krikkit:table.cell>
                            <krikkit:table.cell>{{ $grant->created_at?->diffForHumans() }}</krikkit:table.cell>
                        </krikkit:table.row>
                    @endforeach
                </krikkit:table.rows>
            </krikkit:table>
        @endif
    </div>
</x-settings.frame>
