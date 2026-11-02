<button
    type="button"
    {{ $attributes->class('absolute right-3 top-3 rounded-lg p-1.5 text-krikkit-muted hover:bg-krikkit-soft hover:text-krikkit-fg') }}
    @click="$dispatch('krikkit-modal-close')"
    aria-label="{{ __('messages.Close') }}"
>
    <krikkit:icon name="x" class="size-4" />
</button>
