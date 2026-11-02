<div
    class="relative shrink-0"
    @keydown.escape.window="open = false; importOpen = false"
    @click.outside="open = false; importOpen = false"
>
    <button
        type="button"
        class="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full p-0 text-krikkit-muted transition hover:bg-krikkit-soft hover:text-krikkit-fg"
        aria-label="{{ __('studio.Add') }}"
        aria-haspopup="menu"
        x-bind:aria-expanded="open.toString()"
        @click="importOpen = false; open = ! open"
    >
        <krikkit:icon name="plus" class="size-[18px]" />
    </button>

    <div
        x-cloak
        x-show="open"
        x-transition.origin.top.left
        class="absolute top-full left-0 z-50 mt-1.5 min-w-[13.5rem] rounded-xl border border-krikkit-line bg-[color-mix(in_oklab,var(--color-krikkit-canvas)_55%,var(--color-krikkit-surface)_45%)] p-1"
        role="menu"
    >
        <div
            class="relative"
            @mouseenter="importOpen = true"
            @mouseleave="importOpen = false"
        >
            <button
                type="button"
                role="menuitem"
                class="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-krikkit-fg-soft transition hover:bg-krikkit-soft hover:text-krikkit-fg"
                @click="importOpen = ! importOpen"
                aria-haspopup="menu"
                x-bind:aria-expanded="importOpen.toString()"
            >
                <span>{{ __('studio.Import from…') }}</span>
                <span class="ml-auto flex items-center gap-1.5 pl-3">
                    <krikkit:icon name="github" class="size-3.5 shrink-0" />
                    <krikkit:icon name="chevron-right" class="size-3.5 shrink-0 text-krikkit-subtle" />
                </span>
            </button>

            <div
                x-cloak
                x-show="importOpen"
                class="absolute top-0 left-full z-50 flex pl-1.5"
            >
                <div
                    role="menu"
                    class="min-w-[11rem] rounded-xl border border-krikkit-line bg-[color-mix(in_oklab,var(--color-krikkit-canvas)_55%,var(--color-krikkit-surface)_45%)] p-1"
                >
                    <a
                        href="{{ route('lab', ['import' => 'github']) }}"
                        role="menuitem"
                        data-no-navigate
                        class="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-krikkit-fg-soft transition hover:bg-krikkit-soft hover:text-krikkit-fg"
                    >
                        <krikkit:icon name="github" class="size-3.5 shrink-0" />
                        <span>{{ __('studio.Import from GitHub') }}</span>
                    </a>
                </div>
            </div>
        </div>

        <div class="my-1 border-t border-krikkit-line/60" role="separator"></div>

        <button
            type="button"
            role="menuitem"
            class="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-krikkit-fg-soft transition hover:bg-krikkit-soft hover:text-krikkit-fg disabled:pointer-events-none disabled:opacity-40"
            x-bind:disabled="files.length >= maxFiles"
            @click="pickFiles()"
        >
            <krikkit:icon name="upload" class="size-3.5 shrink-0" />
            <span>{{ __('studio.Upload from computer') }}</span>
        </button>
    </div>
</div>
