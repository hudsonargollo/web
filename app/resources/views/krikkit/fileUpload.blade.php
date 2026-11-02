@props([
    'multiple' => false,
    'accept' => null,
    'label' => null,
    'caption' => null,
    'preview' => null,
])

@php
    $label = $label ?? __('dashboard.Drop files here or browse');
    $caption = $caption ?? __('dashboard.PNG, JPG, PDF…');
@endphp

<div
    x-data="{
        dragging: false,
        files: [],
        preview: @js($preview),
        onDrop(e) {
            this.dragging = false
            this.ingest(e.dataTransfer.files)
            this.$refs.input.dispatchEvent(new Event('change', { bubbles: true }))
        },
        onChange(e) {
            this.ingest(e.target.files)
        },
        ingest(list) {
            this.files = [...list]
            this.$refs.input.files = list
            const file = this.files[0]
            if (file && file.type.startsWith('image/')) {
                this.preview = URL.createObjectURL(file)
            }
        },
    }"
    {{ $attributes->only('class')->class('w-full') }}
>
    <label
        @dragover.prevent="dragging = true"
        @dragleave.prevent="dragging = false"
        @drop.prevent="onDrop"
        class="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-8 text-center transition"
        :class="dragging
            ? 'border-accent bg-accent/10'
            : 'border-krikkit-line bg-krikkit-canvas hover:border-krikkit-subtle'"
    >
        <template x-if="preview">
            <img :src="preview" alt="" class="max-h-16 max-w-full object-contain">
        </template>
        <template x-if="! preview">
            <krikkit:icon name="upload" class="size-6 text-krikkit-muted" />
        </template>
        <span class="text-sm font-medium text-krikkit-fg-soft">{{ $label }}</span>
        <span
            class="text-xs text-krikkit-muted"
            x-text="files.length ? [...files].map(f => f.name).join(', ') : @js($caption)"
        ></span>
        <input
            x-ref="input"
            type="file"
            class="sr-only"
            @if ($multiple) multiple @endif
            @if ($accept) accept="{{ $accept }}" @endif
            {{ $attributes->except('class') }}
            @change="onChange"
        >
    </label>
</div>
