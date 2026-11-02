<div
    class="space-y-8"
    x-data="krikkitSettingsTheme({
        accents: @js($accents),
        bases: @js($bases),
        saved: @js(['accent' => $accent, 'base' => $base, 'mode' => $mode]),
    })"
    x-init="sync()"
>
    <div>
        <h1 class="text-lg font-semibold tracking-tight text-krikkit-fg">{{ __('dashboard.Settings') }}</h1>
        <p class="mt-0.5 text-xs text-krikkit-muted">
            {{ __('dashboard.Default look for guests and new accounts.') }}
        </p>
    </div>

    @include('livewire.dashboard.settings.options.nav')

    <div class="space-y-10">
        <krikkit:card :padding="false" class="space-y-5 !border-0">
            <p class="text-[11px] font-normal uppercase tracking-[0.16em] text-krikkit-subtle">{{ __('dashboard.Accent') }}</p>
            <div class="flex flex-wrap gap-2">
                <template x-for="item in accents" :key="item.id">
                    <button
                        type="button"
                        class="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition"
                        :class="accent === item.id
                            ? 'border-krikkit-fg bg-krikkit-soft text-krikkit-fg'
                            : 'border-krikkit-line text-krikkit-muted hover:border-krikkit-muted hover:text-krikkit-fg'"
                        @click="setAccent(item.id)"
                    >
                        <span class="size-3.5 shrink-0 rounded-full ring-1 ring-black/10 dark:ring-white/15" :style="accentSwatch(item.id)"></span>
                        <span class="font-medium" x-text="item.label"></span>
                    </button>
                </template>
            </div>
        </krikkit:card>

        <krikkit:card :padding="false" class="space-y-4 !border-0">
            <p class="text-[11px] font-normal uppercase tracking-[0.16em] text-krikkit-subtle">{{ __('dashboard.Base') }}</p>
            <div class="flex flex-wrap items-center gap-x-0 gap-y-3">
                <template x-for="(item, index) in bases" :key="item.id">
                    <div class="flex items-center">
                        <button
                            type="button"
                            class="relative size-9 rounded-lg border-2 transition"
                            :class="base === item.id
                                ? 'border-krikkit-fg'
                                : 'border-transparent hover:border-krikkit-line'"
                            :title="item.label"
                            :aria-label="item.label"
                            @click="setBase(item.id)"
                        >
                            <span
                                class="absolute inset-1 rounded-md ring-1 ring-black/10 dark:ring-white/15"
                                :style="baseSwatch(item.id)"
                            ></span>
                        </button>
                        <span
                            x-show="index < bases.length - 1"
                            class="mx-1 hidden h-px w-3 bg-krikkit-line sm:block"
                            aria-hidden="true"
                        ></span>
                    </div>
                </template>
            </div>
            <p class="text-xs text-krikkit-muted">
                {{ __('dashboard.Base ·') }} <span class="font-medium text-krikkit-fg-soft" x-text="baseLabel"></span>
            </p>
        </krikkit:card>

        <krikkit:card :padding="false" class="space-y-4 !border-0">
            <p class="text-[11px] font-normal uppercase tracking-[0.16em] text-krikkit-subtle">{{ __('dashboard.Mode') }}</p>
            <div class="inline-flex rounded-full border border-krikkit-line p-1">
                <button
                    type="button"
                    class="rounded-full px-3.5 py-1.5 text-sm font-medium transition"
                    :class="mode === 'light' ? 'bg-krikkit-soft text-krikkit-fg' : 'text-krikkit-muted hover:text-krikkit-fg'"
                    @click="setMode('light')"
                >
                    {{ __('dashboard.Light') }}
                </button>
                <button
                    type="button"
                    class="rounded-full px-3.5 py-1.5 text-sm font-medium transition"
                    :class="mode === 'dark' ? 'bg-krikkit-soft text-krikkit-fg' : 'text-krikkit-muted hover:text-krikkit-fg'"
                    @click="setMode('dark')"
                >
                    {{ __('dashboard.Dark') }}
                </button>
                <button
                    type="button"
                    class="rounded-full px-3.5 py-1.5 text-sm font-medium transition"
                    :class="mode === 'system' ? 'bg-krikkit-soft text-krikkit-fg' : 'text-krikkit-muted hover:text-krikkit-fg'"
                    @click="setMode('system')"
                >
                    {{ __('dashboard.System') }}
                </button>
            </div>
        </krikkit:card>

        <krikkit:card :padding="false" class="space-y-2 !border-0">
            <p class="text-[11px] font-normal uppercase tracking-[0.16em] text-krikkit-subtle">{{ __('dashboard.Members') }}</p>
            <krikkit:switch align="right" class="w-full justify-between" :label="__('dashboard.Lock member themes')" wire:model="lockMembers" />
            <p class="text-xs text-krikkit-muted">{{ __('dashboard.When locked, personal theme picks are ignored and everyone uses this default.') }}</p>
        </krikkit:card>

        <krikkit:card :padding="false" class="space-y-4 !border-0">
            <p class="text-[11px] font-normal uppercase tracking-[0.16em] text-krikkit-subtle">{{ __('dashboard.Preview') }}</p>
            @include('livewire.dashboard.settings.options.preview')
        </krikkit:card>

        <div class="flex justify-end">
            <krikkit:button type="button" wire:loading.attr="disabled" @click="saveTheme()">
                {{ __('dashboard.Save changes') }}
            </krikkit:button>
        </div>
    </div>
</div>

@script
<script>
    Alpine.data('krikkitSettingsTheme', (config) => {
        const lightAccents = new Set(['yellow', 'lime', 'amber'])

        return {
            accents: config.accents,
            bases: config.bases,
            accent: config.saved?.accent || 'base',
            base: config.saved?.base || 'neutral',
            mode: config.saved?.mode || 'system',

            get baseLabel() {
                return this.bases.find((item) => item.id === this.base)?.label ?? this.base
            },

            accentSwatch(id) {
                if (id === 'base') {
                    return 'background-color: var(--color-neutral-800)'
                }

                const shade = lightAccents.has(id) ? '400' : '500'

                return `background-color: var(--color-${id}-${shade})`
            },

            baseSwatch(id) {
                return `background-color: var(--color-${id}-500)`
            },

            resolvedMode() {
                if (this.mode === 'light' || this.mode === 'dark') {
                    return this.mode
                }

                return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
            },

            sync() {
                this.accent = config.saved?.accent || 'base'
                this.base = config.saved?.base || 'neutral'
                this.mode = config.saved?.mode || 'system'
                this.apply()
            },

            apply() {
                window.krikkitTheme?.apply?.({
                    mode: this.resolvedMode(),
                    accent: this.accent,
                    base: this.base,
                    persist: true,
                })
            },

            setAccent(id) {
                this.accent = id
                this.apply()
            },

            setBase(id) {
                this.base = id
                this.apply()
            },

            setMode(next) {
                this.mode = next
                this.apply()
            },

            saveTheme() {
                this.apply()
                this.$wire.save(this.accent, this.base, this.mode)
            },
        }
    })
</script>
@endscript
