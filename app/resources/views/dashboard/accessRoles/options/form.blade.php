@props([
    'role' => null,
    'clusters',
    'selected' => [],
])

@php
    $title = old('title', $role?->title);
    $summary = old('summary', $role?->summary);
@endphp

<div class="space-y-4">
    <krikkit:card class="space-y-4 !border-0 !p-5">
        <p class="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-krikkit-subtle">{{ __('dashboard.Identity') }}</p>

        <krikkit:field :label="__('dashboard.Title')">
            <krikkit:input name="title" id="title" :value="$title" :placeholder="__('dashboard.Editor')" :invalid="$errors->has('title')" required />
            @error('title')
                <krikkit:field.error>{{ $message }}</krikkit:field.error>
            @enderror
        </krikkit:field>

        <krikkit:field :label="__('dashboard.Summary')">
            <krikkit:input name="summary" id="summary" :value="$summary" :placeholder="__('dashboard.Can revise content')" :invalid="$errors->has('summary')" />
            @error('summary')
                <krikkit:field.error>{{ $message }}</krikkit:field.error>
            @enderror
        </krikkit:field>
    </krikkit:card>

    <div class="space-y-4">
        <p class="px-5 text-xs font-semibold uppercase tracking-[0.14em] text-krikkit-subtle">{{ __('dashboard.Abilities') }}</p>
        <x-access.ability-picker :clusters="$clusters" :selected="$selected" />
    </div>
</div>
