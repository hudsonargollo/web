@php
    $tone = $tone ?? 'page';
    $framed = $framed ?? true;
@endphp

<div @class([
    'relative overflow-hidden',
    'rounded-xl border border-krikkit-line bg-krikkit-canvas' => $framed,
])>
    @if ($tone === 'brief')
        <div class="grid min-h-[16rem] sm:grid-cols-5">
            <div class="flex flex-col gap-3 border-b border-krikkit-line bg-krikkit-surface p-3 sm:col-span-2 sm:border-b-0 sm:border-r">
                <p class="text-[10px] font-medium uppercase tracking-[0.14em] text-krikkit-subtle">{{ __('messages.Prompt') }}</p>
                <p class="text-[11px] leading-snug text-krikkit-muted line-clamp-4">{{ __('messages.A landing page for a ceramic studio. Warm type, large photography, a short about, and a visit form.') }}</p>
                <div class="mt-auto flex items-center gap-2 rounded-xl bg-krikkit-canvas px-2 py-1.5">
                    <span class="min-w-0 flex-1 truncate text-[11px] leading-none text-krikkit-subtle">{{ __('home.Reply…') }}</span>
                    <span class="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-accent leading-none text-accent-foreground">
                        <krikkit:icon name="arrow-up" variant="mini" class="block size-3" />
                    </span>
                </div>
            </div>
            <div class="min-h-0 sm:col-span-3">
                @include('home.partials.site')
            </div>
        </div>
    @elseif ($tone === 'files')
        <div class="grid min-h-[16rem] sm:grid-cols-5">
            <ul class="space-y-0.5 border-b border-krikkit-line bg-krikkit-surface p-2 sm:col-span-2 sm:border-b-0 sm:border-r">
                <li class="px-2 py-1.5 text-[10px] font-medium leading-none text-krikkit-subtle">{{ __('messages.Files') }}</li>
                @foreach (['index.html', 'visit.html', 'about.html', 'styles.css'] as $i => $file)
                    <li @class([
                        'flex items-center gap-1.5 rounded-md px-2 py-1.5',
                        'bg-krikkit-soft text-krikkit-fg' => $i === 0,
                        'text-krikkit-muted' => $i !== 0,
                    ])>
                        <krikkit:icon name="code-bracket" variant="mini" class="block size-3 shrink-0" />
                        <span class="truncate text-[11px] leading-none">{{ $file }}</span>
                    </li>
                @endforeach
            </ul>
            <div class="min-h-0 overflow-hidden p-3 font-mono text-[10px] leading-4 text-krikkit-fg sm:col-span-3">
                <p class="mb-2 text-[10px] font-medium leading-none text-krikkit-muted">index.html</p>
                <p><span class="inline-block w-4 text-krikkit-subtle">1</span> &lt;<span class="text-krikkit-fg">h1</span>&gt;Ceramic studio&lt;/<span class="text-krikkit-fg">h1</span>&gt;</p>
                <p><span class="inline-block w-4 text-krikkit-subtle">2</span> &lt;<span class="text-krikkit-fg">a</span>&gt;Visit&lt;/<span class="text-krikkit-fg">a</span>&gt;</p>
                <p><span class="inline-block w-4 text-krikkit-subtle">3</span> &lt;<span class="text-krikkit-fg">p</span>&gt;Warm type.&lt;/<span class="text-krikkit-fg">p</span>&gt;</p>
            </div>
        </div>
    @elseif ($tone === 'publish')
        <div class="space-y-2 p-3">
            <div class="flex items-center justify-between gap-2 pb-1">
                <span class="truncate text-[11px] font-medium leading-none text-krikkit-fg">{{ __('home.Ceramic studio') }}</span>
                <span class="text-[10px] leading-none text-krikkit-muted">{{ __('home.Draft') }}</span>
            </div>
            <div class="flex items-center justify-between rounded-lg border border-krikkit-line px-3 py-2">
                <span class="text-[11px] leading-none text-krikkit-muted">{{ __('home.Domain') }}</span>
                <span class="truncate font-mono text-[10px] leading-none text-krikkit-fg">studio.lab</span>
            </div>
            <div class="flex items-center justify-between rounded-lg border border-krikkit-line px-3 py-2">
                <span class="text-[11px] leading-none text-krikkit-muted">{{ __('home.GitHub') }}</span>
                <span class="text-[10px] leading-none text-krikkit-subtle">{{ __('home.Ready') }}</span>
            </div>
            <div class="flex h-8 items-center justify-center rounded-lg bg-accent text-[11px] font-medium leading-none text-accent-foreground">
                {{ __('messages.Publish') }}
            </div>
        </div>
    @elseif ($tone === 'layers')
        <div class="relative min-h-[16rem]">
            <div class="absolute left-[6%] top-[10%] w-[40%] overflow-hidden rounded-lg border border-krikkit-line bg-krikkit-surface p-2">
                <p class="px-1 pb-1.5 text-[10px] font-medium leading-none text-krikkit-subtle">{{ __('messages.Files') }}</p>
                @foreach (['index.html', 'visit.html', 'styles.css'] as $i => $file)
                    <p @class([
                        'flex items-center gap-1.5 rounded-md px-1 py-1',
                        'bg-krikkit-soft text-krikkit-fg' => $i === 0,
                        'text-krikkit-muted' => $i !== 0,
                    ])>
                        <krikkit:icon name="code-bracket" variant="mini" class="block size-3 shrink-0" />
                        <span class="truncate text-[10px] leading-none">{{ $file }}</span>
                    </p>
                @endforeach
            </div>
            <div class="absolute right-[6%] top-[16%] w-[54%] overflow-hidden rounded-lg border border-krikkit-line bg-krikkit-canvas p-2.5 font-mono text-[10px] leading-4 text-krikkit-fg">
                <p class="mb-1.5 text-[10px] font-medium leading-none text-krikkit-muted">index.html</p>
                <p><span class="text-krikkit-subtle">1</span> &lt;h1&gt;Ceramic studio&lt;/h1&gt;</p>
                <p><span class="text-krikkit-subtle">2</span> &lt;a&gt;Visit&lt;/a&gt;</p>
            </div>
            <div class="absolute bottom-[8%] left-[22%] w-[46%] overflow-hidden rounded-lg border border-krikkit-line bg-krikkit-surface">
                <div class="flex items-center justify-between px-2.5 py-1.5">
                    <span class="text-[10px] font-medium leading-none text-krikkit-fg">{{ __('home.Ceramic studio') }}</span>
                    <span class="size-1.5 rounded-full bg-emerald-500"></span>
                </div>
                <div class="grid grid-cols-3 gap-1 px-2.5 pb-2.5">
                    <div class="col-span-2 h-8 rounded bg-krikkit-soft"></div>
                    <div class="h-8 rounded bg-krikkit-canvas"></div>
                </div>
            </div>
        </div>
    @else
        @include('home.partials.site')
    @endif
</div>
