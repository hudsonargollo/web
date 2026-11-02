@if ($delta === null)
    <span class="tabular-nums text-krikkit-subtle">—</span>
@else
    <span @class([
        'tabular-nums font-medium',
        'text-teal-700 dark:text-teal-300' => $delta >= 0,
        'text-red-700 dark:text-red-300' => $delta < 0,
    ])>{{ ($delta >= 0 ? '+' : '').$delta }}%</span>
@endif
