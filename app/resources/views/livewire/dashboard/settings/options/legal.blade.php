@props([
    'section',
    'nav',
    'heading',
    'copy',
    'publicRoute' => null,
    'published' => false,
])

<div class="space-y-8">
    <div>
        <h1 class="text-lg font-semibold tracking-tight text-krikkit-fg">{{ __('dashboard.Settings') }}</h1>
        <p class="mt-0.5 text-xs text-krikkit-muted">{{ $copy }}</p>
    </div>

    @include('livewire.dashboard.settings.options.nav', ['section' => $section, 'nav' => $nav])

    <form wire:submit="save" class="space-y-8">
        <krikkit:switch align="right" class="w-full justify-between" :label="__('dashboard.Publish this page')" wire:model="published" />

        @if ($publicRoute && $published)
            <p class="text-xs text-krikkit-muted">
                {{ __('dashboard.Public URL') }}:
                <a href="{{ route($publicRoute) }}" class="break-all text-krikkit-fg underline" target="_blank" rel="noreferrer">
                    {{ route($publicRoute) }}
                </a>
            </p>
        @endif

        <krikkit:field :label="__('dashboard.Title')">
            <krikkit:input size="md" wire:model="title" :placeholder="$heading" :invalid="$errors->has('title')" />
            @error('title')
                <krikkit:field.error>{{ $message }}</krikkit:field.error>
            @enderror
        </krikkit:field>

        <krikkit:field :label="__('dashboard.Last updated')">
            <krikkit:datePicker
                :value="$updatedOn"
                wire:model="updatedOn"
                :placeholder="__('dashboard.Pick a date')"
                :invalid="$errors->has('updatedOn')"
            />
            @error('updatedOn')
                <krikkit:field.error>{{ $message }}</krikkit:field.error>
            @enderror
        </krikkit:field>

        <krikkit:field :label="__('dashboard.Body')">
            <krikkit:editor
                :value="$body"
                wire:model="body"
                :placeholder="__('dashboard.Write the public page…')"
                :invalid="$errors->has('body')"
            />
            <x-slot:description>{{ __('dashboard.Type # then a heading. Shortcuts become formatted text. Leave empty to keep the page unpublished.') }}</x-slot:description>
            @error('body')
                <krikkit:field.error>{{ $message }}</krikkit:field.error>
            @enderror
        </krikkit:field>

        <div class="flex justify-end">
            <krikkit:button type="submit" wire:loading.attr="disabled">
                {{ __('dashboard.Save changes') }}
            </krikkit:button>
        </div>
    </form>
</div>
