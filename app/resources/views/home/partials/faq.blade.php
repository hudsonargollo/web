@php
    $faq = $landing->section('faq');
    $items = is_array($faq['items'] ?? null) ? $faq['items'] : [];
@endphp

<section id="questions" class="border-b border-krikkit-line">
    <div class="relative mx-auto max-w-7xl overflow-hidden border-x border-krikkit-line">
        <div class="relative grid items-start gap-10 px-6 py-20 sm:px-10 md:grid-cols-12 md:py-28 lg:px-12">
            <div class="md:col-span-5">
                <h2 class="text-3xl font-medium leading-[1.15] tracking-tight text-krikkit-fg sm:text-4xl">
                    {{ $faq['title'] }}
                </h2>
            </div>
            <ul class="divide-y divide-krikkit-line border-y border-krikkit-line md:col-span-7">
                @foreach ($items as $index => $item)
                    <li>
                        <button
                            type="button"
                            class="flex w-full items-center justify-between gap-4 px-0 py-5 text-left text-sm font-medium text-krikkit-fg-soft transition hover:text-krikkit-fg sm:py-6 sm:text-[15px]"
                            x-on:click="faq = faq === {{ $index }} ? -1 : {{ $index }}"
                            :class="faq === {{ $index }} ? 'text-krikkit-fg' : ''"
                        >
                            <span>{{ $item['q'] }}</span>
                            <span class="relative size-5 shrink-0 text-krikkit-muted">
                                <span x-show="faq !== {{ $index }}"><krikkit:icon name="plus" class="size-5" /></span>
                                <span x-cloak x-show="faq === {{ $index }}"><krikkit:icon name="minus" class="size-5" /></span>
                            </span>
                        </button>
                        <p x-cloak x-show="faq === {{ $index }}" class="pb-5 text-sm leading-relaxed text-krikkit-muted">{{ $item['a'] }}</p>
                    </li>
                @endforeach
            </ul>
        </div>
    </div>
</section>
