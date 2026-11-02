@php
    $walk = $landing->section('walkthrough');
@endphp

<section id="walkthrough" class="border-b border-krikkit-line">
    <div class="relative mx-auto max-w-7xl overflow-hidden border-x border-krikkit-line">
        <div class="relative px-6 pt-20 sm:px-10 md:px-12 md:pt-28">
            <span class="inline-flex items-center gap-2 border border-krikkit-line bg-krikkit-soft px-3 py-1.5">
                <span class="size-1.5 bg-accent"></span>
                <span class="text-[11px] font-semibold uppercase tracking-[0.15em] text-krikkit-fg-soft">{{ $walk['eyebrow'] }}</span>
            </span>
            <h2 class="mt-6 max-w-2xl text-3xl font-semibold leading-[1.15] tracking-tight text-krikkit-fg sm:text-4xl lg:text-[2.75rem]">
                {{ $walk['title'] }}
            </h2>
            <p class="mt-5 max-w-md text-sm leading-relaxed text-krikkit-muted sm:text-[15px]">
                {{ $walk['copy'] }}
            </p>
        </div>
        <div class="relative mt-12 flex overflow-x-auto border-y border-krikkit-line" role="tablist" aria-label="Product highlights">
            @foreach ($walkTabs as $index => $tab)
                <button
                    type="button"
                    role="tab"
                    class="group relative min-w-[12rem] flex-1 border-r border-krikkit-line px-5 py-4 text-left transition-colors duration-300 last:border-r-0 sm:px-6 sm:py-5"
                    x-on:click="setWalk({{ $index }})"
                    :aria-selected="walk === {{ $index }}"
                    :class="walk === {{ $index }} ? 'text-krikkit-fg' : 'text-krikkit-muted hover:text-krikkit-fg-soft'"
                >
                    <span class="flex flex-col gap-2">
                        <span
                            class="text-[11px] font-semibold tabular-nums tracking-[0.14em] transition-colors duration-300"
                            :class="walk === {{ $index }} ? 'text-krikkit-fg' : 'text-krikkit-subtle group-hover:text-krikkit-muted'"
                        >{{ str_pad((string) ($index + 1), 2, '0', STR_PAD_LEFT) }}</span>
                        <span class="text-[13px] font-medium sm:text-sm">{{ $tab['label'] }}</span>
                    </span>
                    <span class="absolute inset-x-0 bottom-0 h-0.5 bg-krikkit-line">
                        <template x-for="gen in (walk === {{ $index }} ? [walkGen] : [])" :key="gen">
                            <span
                                class="krikkit-walk-progress block h-full origin-left bg-krikkit-fill"
                                :style="'--walk-ms:' + walkMs + 'ms'"
                                x-on:animationend="advanceWalk({{ $index }})"
                            ></span>
                        </template>
                    </span>
                </button>
            @endforeach
        </div>
        <div class="relative min-h-[26rem] overflow-hidden border-b border-krikkit-line bg-krikkit-canvas sm:min-h-[32rem]">
            <canvas
                data-ascii-hexdump
                data-ascii-src="{{ $landing->asciiUrl() }}"
                class="absolute inset-0 size-full"
                aria-hidden="true"
            ></canvas>
            @if ($walkTabs !== [])
                <div class="absolute inset-0 flex items-center justify-center px-6 py-10 sm:px-10">
                    <img
                        src="{{ $walkTabs[0]['image'] }}"
                        alt="{{ $walkTabs[0]['title'] }}"
                        width="1200"
                        height="800"
                        class="max-h-[70%] max-w-[min(42rem,82%)] object-cover transition duration-200 ease-out"
                        :src="walkCopy[walkView].image"
                        :alt="walkCopy[walkView].title"
                        :class="walkFade ? 'translate-y-1 opacity-0' : 'translate-y-0 opacity-100'"
                    >
                </div>
            @endif
        </div>
        <div class="px-6 py-10 sm:px-10 md:px-12 md:py-12">
            <div
                class="max-w-2xl transition duration-200 ease-out"
                :class="walkFade ? 'translate-y-1 opacity-0' : 'translate-y-0 opacity-100'"
            >
                <h3 class="text-xl font-semibold leading-snug text-krikkit-fg sm:text-2xl lg:text-[1.75rem]" x-text="walkCopy[walkView].title"></h3>
                <p class="mt-4 text-sm leading-relaxed text-krikkit-muted sm:text-[15px]" x-text="walkCopy[walkView].copy"></p>
            </div>
        </div>
    </div>
</section>
