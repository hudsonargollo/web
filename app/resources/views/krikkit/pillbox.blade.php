@props([
    'placeholder' => 'Add…',
    'name' => null,
])

<div
    x-data="{
        items: [],
        draft: '',
        add() {
            const v = this.draft.trim()
            if (! v || this.items.includes(v)) return
            this.items.push(v)
            this.draft = ''
        },
        remove(i) { this.items.splice(i, 1) }
    }"
    {{ $attributes->only('class')->class('w-full') }}
>
    <div class="flex min-h-10 flex-wrap items-center gap-1.5 rounded-full border border-transparent bg-krikkit-surface px-3 py-1 focus-within:border-krikkit-muted/40">
        <template x-for="(item, i) in items" :key="item + i">
            <span class="inline-flex items-center gap-1.5 rounded bg-krikkit-soft px-2 py-0.5 text-xs text-krikkit-fg-soft">
                <span x-text="item"></span>
                <button type="button" class="text-krikkit-subtle hover:text-krikkit-fg" @click="remove(i)" aria-label="{{ __('messages.Remove') }}">&times;</button>
            </span>
        </template>
        <input
            type="text"
            x-model="draft"
            @keydown.enter.prevent="add"
            @keydown.comma.prevent="add"
            placeholder="{{ $placeholder }}"
            class="min-w-[6rem] flex-1 border-0 bg-transparent px-1 py-0.5 text-sm text-krikkit-fg outline-none placeholder:text-krikkit-subtle"
        >
    </div>
    <template x-for="item in items" :key="'h-'+item">
        <input type="hidden" @if ($name) name="{{ $name }}[]" @endif :value="item">
    </template>
</div>
