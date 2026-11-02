@props(['publicUrl' => null])

<form wire:submit="save" class="space-y-8">
    <krikkit:switch align="right" class="w-full justify-between" :label="__('dashboard.Publish this post')" wire:model="published" />

    @if ($publicUrl)
        <p class="text-xs text-krikkit-muted">
            {{ __('dashboard.Public URL') }}:
            <a href="{{ $publicUrl }}" class="break-all text-krikkit-fg underline" target="_blank" rel="noreferrer">{{ $publicUrl }}</a>
        </p>
    @endif

    <krikkit:field :label="__('dashboard.Title')">
        <krikkit:input size="md" wire:model.live="title" :placeholder="__('dashboard.Post title')" :invalid="$errors->has('title')" />
        @error('title')
            <krikkit:field.error>{{ $message }}</krikkit:field.error>
        @enderror
    </krikkit:field>

    <krikkit:field :label="__('dashboard.Slug')">
        <krikkit:input size="md" wire:model="slug" :placeholder="__('dashboard.hello-lab')" :invalid="$errors->has('slug')" />
        @error('slug')
            <krikkit:field.error>{{ $message }}</krikkit:field.error>
        @enderror
    </krikkit:field>

    <krikkit:field :label="__('dashboard.Excerpt')">
        <krikkit:textarea rows="3" resize="y" wire:model="excerpt" :placeholder="__('dashboard.A short summary…')" :invalid="$errors->has('excerpt')" />
        @error('excerpt')
            <krikkit:field.error>{{ $message }}</krikkit:field.error>
        @enderror
    </krikkit:field>

    <krikkit:field :label="__('dashboard.Body')">
        <krikkit:editor
            :value="$body"
            wire:model="body"
            :placeholder="__('dashboard.Write…')"
            :invalid="$errors->has('body')"
        />
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
