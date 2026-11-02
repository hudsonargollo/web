@props([
    'value' => null,
    'placeholder' => null,
    'name' => null,
    'invalid' => false,
])

@php
    $name = $name ?? $attributes->get('name');
    $initial = $value ?? $attributes->get('value') ?? '';
    $placeholder = $placeholder ?? __('dashboard.Write…');
    $rail = [
        [
            ['verb' => 'revert', 'title' => __('dashboard.Undo'), 'icon' => 'arrow-uturn-left'],
            ['verb' => 'replay', 'title' => __('dashboard.Redo'), 'icon' => 'arrow-uturn-right'],
        ],
        [
            ['verb' => 'promote', 'arg' => 'h1', 'title' => __('dashboard.Heading 1'), 'glyph' => 'H1'],
            ['verb' => 'promote', 'arg' => 'h2', 'title' => __('dashboard.Heading 2'), 'glyph' => 'H2'],
            ['verb' => 'promote', 'arg' => 'h3', 'title' => __('dashboard.Heading 3'), 'glyph' => 'H3'],
            ['verb' => 'promote', 'arg' => 'p', 'title' => __('dashboard.Paragraph'), 'glyph' => 'P'],
        ],
        [
            ['verb' => 'strong', 'title' => __('dashboard.Bold'), 'glyph' => 'B'],
            ['verb' => 'em', 'title' => __('dashboard.Italic'), 'glyph' => 'I'],
            ['verb' => 'ins', 'title' => __('dashboard.Underline'), 'glyph' => 'U'],
            ['verb' => 'del', 'title' => __('dashboard.Strike'), 'glyph' => 'S'],
            ['verb' => 'glow', 'title' => __('dashboard.Highlight'), 'glyph' => 'H'],
            ['verb' => 'raise', 'title' => __('dashboard.Superscript'), 'glyph' => 'x²'],
            ['verb' => 'lower', 'title' => __('dashboard.Subscript'), 'glyph' => 'x₂'],
        ],
        [
            ['verb' => 'bullets', 'title' => __('dashboard.Bullet list'), 'icon' => 'list-bullet'],
            ['verb' => 'numerals', 'title' => __('dashboard.Numbered list'), 'icon' => 'numbered-list'],
            ['verb' => 'deepen', 'title' => __('dashboard.Indent'), 'icon' => 'chevron-double-right'],
            ['verb' => 'lift', 'title' => __('dashboard.Outdent'), 'icon' => 'chevron-double-left'],
            ['verb' => 'cite', 'title' => __('dashboard.Quote'), 'icon' => 'chat-bubble-left'],
            ['verb' => 'mono', 'title' => __('dashboard.Code block'), 'icon' => 'code-bracket'],
        ],
        [
            ['verb' => 'start', 'title' => __('dashboard.Align left'), 'icon' => 'bars-3-bottom-left'],
            ['verb' => 'mid', 'title' => __('dashboard.Align center'), 'icon' => 'bars-3'],
            ['verb' => 'end', 'title' => __('dashboard.Align right'), 'icon' => 'bars-3-bottom-right'],
            ['verb' => 'spread', 'title' => __('dashboard.Justify'), 'icon' => 'bars-4'],
        ],
        [
            ['verb' => 'href', 'title' => __('dashboard.Link'), 'icon' => 'link'],
            ['verb' => 'detach', 'title' => __('dashboard.Unlink'), 'icon' => 'link-slash'],
            ['verb' => 'figure', 'title' => __('dashboard.Image'), 'icon' => 'photo'],
            ['verb' => 'rule', 'title' => __('dashboard.Divider'), 'icon' => 'minus'],
            ['verb' => 'grid', 'title' => __('dashboard.Table'), 'icon' => 'table-cells'],
            ['verb' => 'wipe', 'title' => __('dashboard.Clear format'), 'icon' => 'paint-brush'],
        ],
    ];
@endphp

<div
    wire:ignore
    x-data="krikkitInkDesk({ draft: @js($initial) })"
    x-init="awake()"
    {{ $attributes->only('class')->class('w-full') }}
>
    <div
        @class([
            'overflow-hidden rounded-2xl border bg-krikkit-surface',
            $invalid ? 'border-red-400/70' : 'border-transparent focus-within:border-krikkit-muted/40',
        ])
    >
        <div
            class="relative z-20 flex flex-wrap items-center gap-px rounded-t-2xl border-b border-krikkit-line bg-krikkit-soft/50 p-1"
            role="toolbar"
            aria-label="{{ __('dashboard.Formatting') }}"
        >
            @foreach ($rail as $cluster)
                @if (! $loop->first)
                    <span class="mx-0.5 hidden h-6 w-px self-center bg-krikkit-line sm:block" aria-hidden="true"></span>
                @endif
                @foreach ($cluster as $key)
                    <krikkit:tooltip :content="$key['title']" position="bottom">
                        <button
                            type="button"
                            tabindex="-1"
                            class="inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-[11px] font-semibold tracking-wide text-krikkit-muted hover:bg-krikkit-soft hover:text-krikkit-fg"
                            aria-label="{{ $key['title'] }}"
                            @mousedown.prevent
                            @click="{{ $key['verb'] }}(@isset($key['arg']){{ \Illuminate\Support\Js::from($key['arg']) }}@endisset)"
                        >
                            @isset($key['icon'])
                                <krikkit:icon :name="$key['icon']" class="size-3.5" />
                            @else
                                <span>{{ $key['glyph'] }}</span>
                            @endisset
                        </button>
                    </krikkit:tooltip>
                @endforeach
            @endforeach
        </div>

        <div
            x-show="ask.visible"
            x-cloak
            class="flex flex-wrap items-center gap-2 border-b border-krikkit-line px-3 py-2"
        >
            <input
                type="url"
                x-model="ask.href"
                x-ref="ask"
                placeholder="{{ __('dashboard.https://') }}"
                class="h-9 min-w-0 flex-1 rounded-full border-transparent bg-krikkit-canvas px-3.5 text-sm text-krikkit-fg outline-none placeholder:text-krikkit-subtle"
                @keydown.enter.prevent="sealAsk()"
                @keydown.escape.prevent="dismissAsk()"
            >
            <krikkit:button type="button" size="sm" @click="sealAsk()">{{ __('dashboard.Apply') }}</krikkit:button>
            <krikkit:button type="button" size="sm" variant="ghost" @click="dismissAsk()">{{ __('dashboard.Cancel') }}</krikkit:button>
        </div>

        <div class="relative">
            <div
                x-ref="desk"
                class="min-h-72 whitespace-pre-wrap px-4 py-3 text-sm leading-relaxed text-krikkit-fg outline-none
                    [&_h1]:mb-3 [&_h1]:text-2xl [&_h1]:font-semibold
                    [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-semibold
                    [&_h3]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold
                    [&_p]:mb-3 [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-5
                    [&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:pl-5
                    [&_blockquote]:mb-3 [&_blockquote]:border-l-2 [&_blockquote]:border-krikkit-line [&_blockquote]:pl-3 [&_blockquote]:text-krikkit-muted
                    [&_pre]:mb-3 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-krikkit-soft [&_pre]:px-3 [&_pre]:py-2 [&_pre]:font-mono [&_pre]:text-xs
                    [&_code]:rounded [&_code]:bg-krikkit-soft [&_code]:px-1 [&_code]:font-mono [&_code]:text-xs
                    [&_mark]:rounded-sm [&_mark]:bg-krikkit-soft [&_mark]:text-krikkit-fg
                    [&_a]:text-accent-content [&_a]:underline [&_a]:hover:text-krikkit-fg
                    [&_img]:max-w-full [&_img]:rounded-lg
                    [&_table]:mb-3 [&_table]:w-full [&_table]:border-collapse
                    [&_th]:border [&_th]:border-krikkit-line [&_th]:px-2 [&_th]:py-1 [&_th]:text-left
                    [&_td]:border [&_td]:border-krikkit-line [&_td]:px-2 [&_td]:py-1
                    [&_hr]:my-4 [&_hr]:border-krikkit-line"
                contenteditable="true"
                role="textbox"
                aria-multiline="true"
                aria-placeholder="{{ $placeholder }}"
                @input="emit()"
                @paste="ingestPlain($event)"
                @keydown="foldMarks($event)"
                @keydown.mod.z.prevent="revert()"
                @keydown.mod.shift.z.prevent="replay()"
                @keydown.mod.b.prevent="strong()"
                @keydown.mod.i.prevent="em()"
                @keydown.mod.u.prevent="ins()"
            ></div>
            <p
                x-show="blank"
                x-cloak
                class="pointer-events-none absolute left-4 top-3 text-sm text-krikkit-subtle"
            >{{ $placeholder }}</p>
        </div>

        <input
            x-ref="vault"
            type="hidden"
            @if ($name) name="{{ $name }}" @endif
            value="{{ $initial }}"
            {{ $attributes->whereStartsWith('wire:') }}
        >
    </div>
</div>
