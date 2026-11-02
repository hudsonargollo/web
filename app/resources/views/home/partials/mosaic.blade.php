@php
    $corners = [
        '-left-px -top-px border-l-2 border-t-2',
        '-right-px -top-px border-r-2 border-t-2',
        '-bottom-px -left-px border-b-2 border-l-2',
        '-bottom-px -right-px border-b-2 border-r-2',
    ];

    $rings = [
        ['label' => __('messages.Brief'), 'circles' => ['hatch', 'hatch']],
        ['label' => __('messages.Canvas'), 'circles' => ['empty', 'fill']],
        ['label' => __('messages.Files'), 'circles' => ['sky', 'empty']],
        ['label' => __('messages.Publish'), 'circles' => ['fill', 'empty'], 'hide' => true],
    ];

    $circleClass = [
        'empty' => 'border-accent',
        'hatch' => 'border-accent bg-[repeating-linear-gradient(-45deg,var(--color-krikkit-line),var(--color-krikkit-line)_1px,transparent_1px,transparent_4px)]',
        'fill' => 'border-accent bg-krikkit-canvas bg-[repeating-linear-gradient(-45deg,var(--color-accent),var(--color-accent)_1px,transparent_1px,transparent_4px)]',
        'sky' => 'z-10 border-sky-500 bg-krikkit-canvas bg-[repeating-linear-gradient(-45deg,var(--color-sky-500),var(--color-sky-500)_1px,transparent_1px,transparent_4px)]',
    ];
@endphp

<section id="mosaic" class="scroll-mt-20 border-b border-krikkit-line">
    <div class="relative mx-auto max-w-7xl overflow-hidden border-x border-krikkit-line py-16 md:py-24">
        <div class="pointer-events-none absolute inset-0 krikkit-home-dots" aria-hidden="true"></div>
        <div class="relative mx-auto grid max-w-5xl gap-4 px-6 lg:grid-cols-2">
            <article class="group relative border border-krikkit-line bg-krikkit-canvas">
                @foreach ($corners as $corner)
                    <span class="absolute {{ $corner }} block size-2 border-accent"></span>
                @endforeach
                <div class="p-6 pb-3">
                    <p class="flex items-center gap-2 text-sm text-krikkit-muted">
                        <krikkit:icon name="folder" variant="mini" class="block size-4" />
                        {{ __('messages.Files') }}
                    </p>
                    <p class="mt-8 text-2xl font-medium leading-snug tracking-tight text-krikkit-fg">
                        {{ __('home.Open the markup. The canvas is a preview of those files.') }}
                    </p>
                </div>
                <div class="relative mb-6 overflow-hidden border-t border-dashed border-krikkit-line sm:mb-0">
                    <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(125%_125%_at_50%_0%,transparent_40%,var(--color-krikkit-soft),var(--color-krikkit-canvas)_125%)]"></div>
                    <div class="aspect-[76/59]">
                        @include('home.partials.desk', ['tone' => 'layers', 'framed' => false])
                    </div>
                </div>
            </article>

            <article class="group relative border border-krikkit-line bg-krikkit-canvas">
                @foreach ($corners as $corner)
                    <span class="absolute {{ $corner }} block size-2 border-accent"></span>
                @endforeach
                <div class="p-6 pb-3">
                    <p class="flex items-center gap-2 text-sm text-krikkit-muted">
                        <krikkit:icon name="computer-desktop" variant="mini" class="block size-4" />
                        {{ __('messages.Canvas') }}
                    </p>
                    <p class="mt-8 text-2xl font-medium leading-snug tracking-tight text-krikkit-fg">
                        {{ __('home.The preview refreshes as files land. No export step.') }}
                    </p>
                </div>
                <div class="relative mb-6 overflow-hidden sm:mb-0">
                    <div class="pointer-events-none absolute -inset-6 bg-[radial-gradient(50%_50%_at_75%_50%,transparent,var(--color-krikkit-canvas)_100%)]"></div>
                    <div class="aspect-[76/59] border-t border-krikkit-line">
                        @include('home.partials.desk', ['tone' => 'page', 'framed' => false])
                    </div>
                </div>
            </article>

            <article class="relative border border-krikkit-line bg-krikkit-canvas p-6 lg:col-span-2">
                @foreach ($corners as $corner)
                    <span class="absolute {{ $corner }} block size-2 border-accent"></span>
                @endforeach
                <p class="mx-auto my-6 max-w-md text-balance text-center text-2xl font-medium tracking-tight text-krikkit-fg">
                    {{ __('home.One desk from the brief to a live page.') }}
                </p>
                <div class="flex justify-center gap-6 overflow-hidden">
                    @foreach ($rings as $ring)
                        <div @class(['hidden sm:block' => $ring['hide'] ?? false])>
                            <div class="w-fit bg-gradient-to-b from-krikkit-line to-transparent p-px">
                                <div class="relative flex aspect-square w-fit items-center -space-x-4 bg-gradient-to-b from-krikkit-canvas to-krikkit-soft/40 p-4">
                                    @foreach ($ring['circles'] as $pattern)
                                        <span class="size-7 rounded-full border sm:size-8 {{ $circleClass[$pattern] }}"></span>
                                    @endforeach
                                </div>
                            </div>
                            <span class="mt-1.5 block text-center text-sm text-krikkit-muted">{{ $ring['label'] }}</span>
                        </div>
                    @endforeach
                </div>
            </article>
        </div>
    </div>
</section>
