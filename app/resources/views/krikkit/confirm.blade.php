@props([
    'name',
    'title',
    'copy' => null,
    'size' => 'sm',
])

<krikkit:modal :name="$name" :size="$size" {{ $attributes }}>
    @isset($trigger)
        <x-slot:trigger>{{ $trigger }}</x-slot:trigger>
    @endisset
    <krikkit:modal.close />
    <h3 class="pr-8 text-lg font-semibold text-krikkit-fg">{{ $title }}</h3>
    @if (filled($copy))
        <p class="mt-2 text-sm text-krikkit-muted">{{ $copy }}</p>
    @endif
    {{ $slot }}
    <div class="mt-5 flex justify-end gap-2">
        <krikkit:button
            type="button"
            variant="ghost"
            @click="$dispatch('krikkit-modal-close', @js($name))"
        >
            {{ __('dashboard.Cancel') }}
        </krikkit:button>
        {{ $action }}
    </div>
</krikkit:modal>
