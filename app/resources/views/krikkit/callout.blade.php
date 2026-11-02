@props([
    'tone' => 'info',
    'icon' => null,
])

@php
    $tones = match ($tone) {
        'success' => 'border-green-200 bg-green-50 text-green-900 dark:border-green-900/60 dark:bg-green-950/40 dark:text-green-100',
        'warning' => 'border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100',
        'danger' => 'border-red-200 bg-red-50 text-red-900 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-100',
        default => 'border-teal-200 bg-teal-50 text-teal-950 dark:border-teal-900/60 dark:bg-teal-950/40 dark:text-teal-100',
    };

    $iconName = $icon ?? match ($tone) {
        'success' => 'check',
        'warning' => 'warning',
        'danger' => 'x',
        default => 'info',
    };
@endphp

<div {{ $attributes->class(['flex gap-3 rounded-xl border px-4 py-3', $tones]) }} role="status">
    <krikkit:icon :name="$iconName" class="mt-0.5 size-5 shrink-0" />
    <div class="min-w-0 flex-1 space-y-1">
        {{ $slot }}
    </div>
</div>
