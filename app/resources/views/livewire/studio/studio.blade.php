<x-studio.frame :user="$user" :site="$site" :plan-title="$planTitle" :pack-offer="$packOffer">
    @include('livewire.studio.partials.hero')

    @if (! $isEmpty)
        @include('livewire.studio.partials.projects')
    @endif

    @include('livewire.studio.partials.projectModals')
</x-studio.frame>
