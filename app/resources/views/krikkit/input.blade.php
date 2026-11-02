@props([
    'type' => 'text',
    'size' => 'md',
    'invalid' => false,
    'copyable' => false,
])

@php
    $hasPrefix = isset($prefix);
    $hasSuffix = isset($suffix);
    $wrapped = $copyable || $hasPrefix || $hasSuffix;

    $height = match ($size) {
        'sm' => 'h-9 text-sm leading-5',
        'lg' => 'h-12 text-base leading-6',
        default => 'h-10 text-sm leading-5',
    };

    $pl = match ($size) {
        'sm' => 'pl-3.5',
        'lg' => 'pl-4',
        default => 'pl-4',
    };
    $pr = match ($size) {
        'sm' => 'pr-3.5',
        'lg' => 'pr-4',
        default => 'pr-4',
    };

    if ($hasPrefix) {
        $pl = match ($size) {
            'sm' => 'pl-8',
            'lg' => 'pl-10',
            default => 'pl-9',
        };
    }

    if ($copyable) {
        $pr = match ($size) {
            'sm' => 'pr-14',
            'lg' => 'pr-16',
            default => 'pr-14',
        };
    } elseif ($hasSuffix) {
        $pr = match ($size) {
            'sm' => 'pr-12',
            'lg' => 'pr-14',
            default => 'pr-12',
        };
    }

    $copyBtnHeight = match ($size) {
        'sm' => 'h-7',
        'lg' => 'h-9',
        default => 'h-8',
    };

    $affixInset = match ($size) {
        'sm' => 'px-3.5',
        'lg' => 'px-4',
        default => 'px-4',
    };

    $inputClasses = [
        'w-full rounded-full border bg-krikkit-surface outline-none transition',
        'text-krikkit-fg placeholder:text-krikkit-subtle',
        'disabled:cursor-not-allowed disabled:opacity-50',
        $height,
        $pl,
        $pr,
        $invalid
            ? 'border-red-400/70 focus:border-red-500'
            : 'border-transparent focus:border-krikkit-muted/40',
    ];
@endphp

@if ($wrapped)
    <div
        {{ $attributes->only('class')->class('relative w-full') }}
        @if ($copyable)
            x-data="{
                copied: false,
                async copy() {
                    const el = this.$refs.input
                    const text = el?.value ?? ''
                    try {
                        await navigator.clipboard.writeText(text)
                        this.copied = true
                        clearTimeout(this._copyTimer)
                        this._copyTimer = setTimeout(() => { this.copied = false }, 1600)
                    } catch (e) {}
                },
            }"
        @endif
    >
        @isset($prefix)
            <span class="pointer-events-none absolute inset-y-0 left-0 flex items-center {{ $affixInset }} text-sm tabular-nums text-krikkit-muted">{{ $prefix }}</span>
        @endisset

        <input
            @if ($copyable) x-ref="input" @endif
            type="{{ $type }}"
            {{ $attributes->except('class')->class($inputClasses) }}
        >

        @isset($suffix)
            <span class="pointer-events-none absolute inset-y-0 right-0 flex items-center {{ $affixInset }} text-xs font-medium tracking-wide text-krikkit-muted">{{ $suffix }}</span>
        @endisset

        @if ($copyable)
            <button
                type="button"
                class="absolute inset-y-0 right-1.5 my-auto inline-flex {{ $copyBtnHeight }} shrink-0 items-center rounded-full px-2.5 text-xs font-medium text-krikkit-muted transition hover:bg-krikkit-soft hover:text-krikkit-fg"
                x-on:click="copy()"
                x-bind:aria-label="copied ? @js(__('dashboard.Copied')) : @js(__('dashboard.Copy'))"
            >
                <span x-text="copied ? @js(__('dashboard.Copied')) : @js(__('dashboard.Copy'))"></span>
            </button>
        @endif
    </div>
@else
    <input
        type="{{ $type }}"
        {{ $attributes->class($inputClasses) }}
    >
@endif
