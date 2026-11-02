@props([
    'color' => 'zinc',
    'size' => 'sm',
])

@php
    $sizes = match ($size) {
        'xs' => 'px-1.5 py-0.5 text-[10px]',
        'lg' => 'px-2.5 py-1 text-sm',
        default => 'px-2 py-0.5 text-xs',
    };

    $colors = match ($color) {
        'teal' => 'bg-teal-50 text-teal-800 ring-teal-600/20 dark:bg-teal-950/50 dark:text-teal-200 dark:ring-teal-400/20',
        'red' => 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-950/50 dark:text-red-200 dark:ring-red-400/20',
        'amber' => 'bg-amber-50 text-amber-800 ring-amber-600/20 dark:bg-amber-950/50 dark:text-amber-200 dark:ring-amber-400/20',
        'green' => 'bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-950/50 dark:text-green-200 dark:ring-green-400/20',
        'blue' => 'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-950/50 dark:text-blue-200 dark:ring-blue-400/20',
        default => 'bg-krikkit-soft text-krikkit-fg-soft ring-krikkit-muted/20',
    };
@endphp

<span {{ $attributes->class(['inline-flex items-center gap-1 rounded-md font-medium ring-1 ring-inset', $sizes, $colors]) }}>
    {{ $slot }}
</span>
