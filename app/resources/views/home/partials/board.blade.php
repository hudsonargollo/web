{{-- Decorative Lab workspace: chat rail + code canvas. Not interactive. --}}
@php
    $codeLines = [
        ['n' => '1', 'html' => '&lt;!DOCTYPE <span class="text-emerald-700 dark:text-emerald-400">html</span>&gt;'],
        ['n' => '2', 'html' => '&lt;<span class="text-rose-700 dark:text-rose-400">html</span> <span class="text-cyan-700 dark:text-cyan-400">lang</span>=<span class="text-emerald-700 dark:text-emerald-400">"en"</span>&gt;'],
        ['n' => '3', 'html' => '&lt;<span class="text-rose-700 dark:text-rose-400">head</span>&gt;'],
        ['n' => '4', 'html' => '&nbsp;&nbsp;&lt;<span class="text-rose-700 dark:text-rose-400">title</span>&gt;Ceramic studio&lt;/<span class="text-rose-700 dark:text-rose-400">title</span>&gt;'],
        ['n' => '5', 'html' => '&lt;/<span class="text-rose-700 dark:text-rose-400">head</span>&gt;'],
        ['n' => '6', 'html' => '&lt;<span class="text-rose-700 dark:text-rose-400">body</span>&gt;'],
        ['n' => '7', 'html' => '&nbsp;&nbsp;&lt;<span class="text-rose-700 dark:text-rose-400">h1</span>&gt;Ceramic studio&lt;/<span class="text-rose-700 dark:text-rose-400">h1</span>&gt;'],
        ['n' => '8', 'html' => '&nbsp;&nbsp;&lt;<span class="text-rose-700 dark:text-rose-400">a</span> <span class="text-cyan-700 dark:text-cyan-400">href</span>=<span class="text-emerald-700 dark:text-emerald-400">"/visit"</span>&gt;Visit&lt;/<span class="text-rose-700 dark:text-rose-400">a</span>&gt;'],
        ['n' => '9', 'html' => '&lt;/<span class="text-rose-700 dark:text-rose-400">body</span>&gt;'],
        ['n' => '10', 'html' => '&lt;/<span class="text-rose-700 dark:text-rose-400">html</span>&gt;'],
    ];
@endphp

<div class="pointer-events-none flex h-full select-none flex-col overflow-hidden rounded-[12px] border border-krikkit-line bg-krikkit-canvas text-[11px] leading-none" aria-hidden="true">
    <header class="flex h-10 shrink-0 items-stretch border-b border-krikkit-line bg-krikkit-canvas">
        <div class="flex w-[14.5rem] min-w-0 shrink-0 items-center gap-1.5 border-r border-krikkit-line/80 px-3">
            <span class="truncate text-[11px] font-semibold tracking-tight text-krikkit-fg">{{ $site->name() }}</span>
            <span class="shrink-0 text-krikkit-subtle">/</span>
            <span class="shrink-0 text-[11px] text-krikkit-muted">{{ __('messages.Lab') }}</span>
            <span class="ml-auto inline-flex shrink-0 items-center font-mono text-[10px] tabular-nums leading-none text-krikkit-muted">
                {{ __('home.Credits') }}
                <span class="ml-1 text-krikkit-fg">12 / 100</span>
            </span>
        </div>
        <div class="flex min-w-0 flex-1 items-center pl-2 pr-3">
            <span class="inline-flex h-7 items-center gap-1 px-2 text-[11px] text-krikkit-muted">
                <krikkit:icon name="computer-desktop" variant="mini" class="block size-3" />
                <span>{{ __('messages.Preview') }}</span>
            </span>
            <span class="mx-0.5 h-3 w-px shrink-0 bg-krikkit-line"></span>
            <span class="relative inline-flex h-7 items-center gap-1 px-2 text-[11px] text-krikkit-fg">
                <krikkit:icon name="document-text" variant="mini" class="block size-3" />
                <span>index.html</span>
                <span class="absolute inset-x-1.5 bottom-0 h-px bg-krikkit-fg"></span>
            </span>
            <span class="inline-flex h-7 items-center gap-1 px-2 text-[11px] text-krikkit-muted">
                <krikkit:icon name="folder" variant="mini" class="block size-3" />
                <span>{{ __('messages.Files') }}</span>
            </span>
            <span class="inline-flex size-6 items-center justify-center text-krikkit-muted">
                <krikkit:icon name="plus" variant="mini" class="block size-3" />
            </span>
            <span class="ml-auto inline-flex h-7 items-center gap-1 rounded-md bg-accent px-2 text-[11px] font-medium text-accent-foreground">
                <krikkit:icon name="globe-alt" variant="mini" class="block size-3" />
                <span>{{ __('messages.Publish') }}</span>
            </span>
        </div>
    </header>

    <div class="flex min-h-0 flex-1 overflow-hidden">
        <aside class="flex w-[14.5rem] shrink-0 flex-col border-r border-krikkit-line/80 bg-krikkit-canvas">
            <div class="min-h-0 flex-1 space-y-2 overflow-hidden p-2.5">
                <div class="flex justify-end">
                    <p class="max-w-[92%] rounded-lg rounded-br-sm bg-accent px-2 py-1 text-left text-[10px] leading-snug text-accent-foreground line-clamp-3">
                        {{ __('messages.A landing page for a ceramic studio. Warm type, large photography, a short about, and a visit form.') }}
                    </p>
                </div>
                <div class="flex items-start gap-1.5">
                    <span class="mt-px inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-accent/15 text-[8px] font-semibold leading-none text-accent-content">
                        {{ strtoupper(substr($site->name(), 0, 1)) }}
                    </span>
                    <p class="min-w-0 pt-px text-[10px] leading-snug text-krikkit-fg line-clamp-2">
                        {{ __('home.Laying out the landing — warm type, photography, and a visit form.') }}
                    </p>
                </div>
            </div>
            <div class="shrink-0 p-2">
                <div class="rounded-xl bg-krikkit-surface p-1.5">
                    <p class="px-1 py-0.5 text-[11px] leading-none text-krikkit-subtle">{{ __('home.Reply…') }}</p>
                    <div class="mt-1 flex items-center justify-between">
                        <span class="inline-flex size-6 items-center justify-center text-krikkit-muted">
                            <krikkit:icon name="plus" variant="mini" class="block size-3" />
                        </span>
                        <span class="inline-flex size-6 items-center justify-center rounded-full bg-accent text-accent-foreground">
                            <krikkit:icon name="arrow-up" variant="mini" class="block size-3" />
                        </span>
                    </div>
                </div>
            </div>
        </aside>

        <div class="flex min-w-0 flex-1 overflow-hidden">
            <div class="flex min-w-0 flex-1 flex-col bg-krikkit-canvas">
                <div class="flex h-8 shrink-0 items-center justify-between gap-2 border-b border-krikkit-line px-2.5">
                    <p class="truncate text-[11px] font-medium leading-none text-krikkit-fg">index.html</p>
                    <p class="truncate text-[10px] leading-none text-krikkit-subtle">{{ __('home.editing') }}</p>
                </div>
                <div class="min-h-0 flex-1 overflow-hidden font-mono text-[10px] leading-4 text-krikkit-fg">
                    @foreach ($codeLines as $i => $line)
                        <div @class([
                            'flex items-start gap-2 px-2 py-px',
                            'bg-krikkit-soft/70' => $i === 6,
                        ])>
                            <span class="w-4 shrink-0 text-right tabular-nums text-krikkit-subtle">{{ $line['n'] }}</span>
                            <span class="min-w-0 truncate">{!! $line['html'] !!}</span>
                        </div>
                    @endforeach
                </div>
            </div>

            <div class="hidden w-[9.5rem] shrink-0 flex-col border-l border-krikkit-line/80 bg-krikkit-canvas md:flex">
                <div class="flex h-8 shrink-0 items-center justify-between gap-2 border-b border-krikkit-line px-2">
                    <p class="truncate text-[11px] font-medium leading-none text-krikkit-fg">{{ __('messages.Files') }}</p>
                    <p class="text-[10px] tabular-nums leading-none text-krikkit-subtle">3</p>
                </div>
                <ul class="min-h-0 flex-1 space-y-0.5 overflow-hidden p-1.5">
                    @foreach ([
                        ['name' => 'index.html', 'on' => true],
                        ['name' => 'styles.css', 'on' => false],
                        ['name' => 'visit.html', 'on' => false],
                    ] as $file)
                        <li @class([
                            'flex items-center gap-1.5 rounded-md px-1.5 py-1',
                            'bg-krikkit-soft text-krikkit-fg' => $file['on'],
                            'text-krikkit-muted' => ! $file['on'],
                        ])>
                            <krikkit:icon name="code-bracket" variant="mini" class="block size-3 shrink-0" />
                            <span class="min-w-0 truncate text-[10px] leading-none">{{ $file['name'] }}</span>
                        </li>
                    @endforeach
                </ul>
            </div>
        </div>
    </div>
</div>
