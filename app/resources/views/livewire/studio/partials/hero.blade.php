<section class="relative flex min-h-[calc(100dvh-3.5rem)] flex-col justify-center px-4 py-10 sm:px-6 lg:px-10">
    <div class="relative mx-auto w-full max-w-3xl text-center">
        <h1 class="text-3xl font-semibold tracking-tight text-krikkit-fg sm:text-4xl">
            {{ __('studio.What will you build today?') }}
        </h1>
        <p class="mt-3 text-sm text-krikkit-muted sm:text-base">
            {{ __('studio.Describe a site or app. Lab will write the files.') }}
        </p>

        <form
            class="mt-8 text-left"
            x-data="studioComposer"
            x-on:studio-seed-prompt.window="onSeed($event)"
            @submit.prevent="goToLab()"
        >
            <div class="rounded-2xl border border-krikkit-line bg-krikkit-surface p-3.5 sm:p-4">
                <label class="sr-only" for="studio-brief">{{ __('studio.Ask Lab to build…') }}</label>
                <textarea
                    id="studio-brief"
                    rows="3"
                    x-model="brief"
                    placeholder="{{ __('studio.Ask Lab to build…') }}"
                    class="min-h-[72px] w-full resize-none bg-transparent text-sm leading-relaxed text-krikkit-fg outline-none placeholder:text-krikkit-subtle"
                    x-on:keydown.enter="if (! $event.shiftKey) { $event.preventDefault(); goToLab() }"
                ></textarea>

                <div class="mt-2 space-y-2" x-show="files.length > 0" x-cloak>
                    <div class="flex max-w-full flex-wrap gap-2">
                        <template x-for="row in files" :key="row.id">
                            <div class="group relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-krikkit-line bg-krikkit-soft">
                                <img
                                    x-show="row.image"
                                    :src="row.url"
                                    :alt="row.name"
                                    class="h-full w-full object-cover"
                                >
                                <div x-show="! row.image" class="flex h-full w-full flex-col items-center justify-between px-1.5 py-1.5">
                                    <p class="w-full truncate px-0.5 text-center text-[10px] font-medium leading-tight text-krikkit-fg" x-text="row.name" :title="row.name"></p>
                                    <p class="text-[9px] leading-none text-krikkit-muted" x-text="row.bytes"></p>
                                </div>
                                <button
                                    type="button"
                                    class="absolute top-1 right-1 inline-flex h-5 w-5 items-center justify-center rounded-md bg-krikkit-surface text-krikkit-fg"
                                    @click="removeFile(row.id)"
                                    :aria-label="'{{ __('studio.Remove file') }} ' + row.name"
                                >
                                    <krikkit:icon name="x" class="size-3" />
                                </button>
                            </div>
                        </template>
                    </div>
                </div>

                <input
                    type="file"
                    class="hidden"
                    multiple
                    x-ref="fileInput"
                    :accept="accept"
                    @change="onFilesSelected($event)"
                >

                <div class="mt-2 flex items-center justify-between gap-3">
                    @include('livewire.studio.partials.composerPlus')
                    <krikkit:button type="submit" size="sm" square aria-label="{{ __('studio.Open Lab') }}" :navigate="false">
                        <krikkit:icon name="arrow-up" class="size-4" />
                    </krikkit:button>
                </div>
            </div>
        </form>

        <div id="studio-seed-chips" wire:ignore>
            {{-- Matches Lab SeedChips skeleton until the shared React island mounts. --}}
            <div class="mt-6 flex w-full justify-center">
                <div class="flex w-max max-w-full flex-nowrap items-center gap-2 overflow-hidden">
                    <span class="inline-flex h-8 shrink-0 items-center gap-2 rounded-full border border-krikkit-line px-3.5">
                        <span class="size-3.5 animate-pulse rounded bg-krikkit-soft" aria-hidden></span>
                        <span class="h-2.5 w-14 animate-pulse rounded-full bg-krikkit-soft" aria-hidden></span>
                    </span>
                    <span class="inline-flex h-8 shrink-0 items-center gap-2 rounded-full border border-krikkit-line px-3.5">
                        <span class="size-3.5 animate-pulse rounded bg-krikkit-soft" aria-hidden></span>
                        <span class="h-2.5 w-16 animate-pulse rounded-full bg-krikkit-soft" aria-hidden></span>
                    </span>
                    <span class="inline-flex h-8 shrink-0 items-center gap-2 rounded-full border border-krikkit-line px-3.5">
                        <span class="size-3.5 animate-pulse rounded bg-krikkit-soft" aria-hidden></span>
                        <span class="h-2.5 w-12 animate-pulse rounded-full bg-krikkit-soft" aria-hidden></span>
                    </span>
                    <span class="inline-flex h-8 shrink-0 items-center gap-2 rounded-full border border-krikkit-line px-3.5">
                        <span class="size-3.5 animate-pulse rounded bg-krikkit-soft" aria-hidden></span>
                        <span class="h-2.5 w-14 animate-pulse rounded-full bg-krikkit-soft" aria-hidden></span>
                    </span>
                    <span class="inline-flex h-8 w-8 shrink-0 animate-pulse rounded-full border border-krikkit-line bg-krikkit-soft" aria-hidden></span>
                </div>
            </div>
        </div>

        <p class="mt-5">
            <a
                href="{{ route('lab', ['import' => 'github']) }}"
                data-no-navigate
                class="inline-flex items-center gap-1.5 text-xs font-medium text-krikkit-muted transition hover:text-krikkit-fg"
            >
                {{ __('studio.or import from GitHub') }}
                <krikkit:icon name="github" class="size-3.5" />
            </a>
        </p>
    </div>
</section>
