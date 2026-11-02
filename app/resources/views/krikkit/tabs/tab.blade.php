@props([
    'name',
])

<button
    type="button"
    role="tab"
    @click="active = @js($name)"
    :aria-selected="active === @js($name)"
    {{ $attributes->class('rounded-lg px-3 py-1.5 text-sm font-medium transition') }}
    :class="active === @js($name)
        ? 'bg-krikkit-surface text-krikkit-fg'
        : 'text-krikkit-muted hover:text-krikkit-fg'"
>
    {{ $slot }}
</button>
