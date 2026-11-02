<div class="space-y-8">
    <div class="flex flex-wrap items-end justify-between gap-3">
        <div class="min-w-0">
            <h1 class="text-lg font-semibold tracking-tight text-krikkit-fg">{{ __('dashboard.Languages') }}</h1>
            <p class="mt-0.5 text-xs text-krikkit-muted">{{ __('dashboard.Add locales, then translate existing UI phrases.') }}</p>
        </div>
        @allows('languages.compose')
            <krikkit:button
                href="{{ route('dashboard.languages.create') }}"
                variant="ghost"
                square
                size="sm"
                aria-label="{{ __('dashboard.New language') }}"
            >
                <krikkit:icon name="plus" class="size-4" />
            </krikkit:button>
        @endallows
    </div>

    @if ($languages->isEmpty())
        <p class="text-sm text-krikkit-muted">{{ __('dashboard.No languages yet.') }}</p>
    @else
        <krikkit:table>
            <krikkit:table.columns>
                <krikkit:table.column>{{ __('dashboard.Language') }}</krikkit:table.column>
                <krikkit:table.column>{{ __('dashboard.Code') }}</krikkit:table.column>
                <krikkit:table.column>{{ __('dashboard.Status') }}</krikkit:table.column>
                <krikkit:table.column>{{ __('dashboard.Phrases') }}</krikkit:table.column>
                <krikkit:table.column align="right"></krikkit:table.column>
            </krikkit:table.columns>
            <krikkit:table.rows>
                @foreach ($languages as $language)
                    @php
                        $done = $language->code === $sourceLocale
                            ? $totalPhrases
                            : (int) ($filledCounts[$language->id] ?? 0);
                    @endphp
                    <krikkit:table.row>
                        <krikkit:table.cell>
                            <p class="truncate text-xs font-medium text-krikkit-fg">{{ $language->name }}</p>
                            @if (filled($language->native_name) && $language->native_name !== $language->name)
                                <p class="truncate text-[11px] text-krikkit-muted">{{ $language->native_name }}</p>
                            @endif
                        </krikkit:table.cell>
                        <krikkit:table.cell>
                            <span class="text-krikkit-muted">{{ $language->code }}</span>
                        </krikkit:table.cell>
                        <krikkit:table.cell>
                            <div class="flex flex-wrap items-center gap-1">
                                @if ($language->is_default)
                                    <krikkit:badge color="teal" size="xs">{{ __('dashboard.Default') }}</krikkit:badge>
                                @endif
                                @if ($language->enabled)
                                    <krikkit:badge size="xs">{{ __('dashboard.Enabled') }}</krikkit:badge>
                                @else
                                    <krikkit:badge size="xs">{{ __('dashboard.Disabled') }}</krikkit:badge>
                                @endif
                            </div>
                        </krikkit:table.cell>
                        <krikkit:table.cell>
                            <span class="text-krikkit-muted">{{ $done }} / {{ $totalPhrases }}</span>
                        </krikkit:table.cell>
                        <krikkit:table.cell align="right">
                            <div class="inline-flex items-center gap-1">
                                @allows('languages.revise')
                                    <krikkit:button
                                        href="{{ route('dashboard.languages.translate', $language) }}"
                                        variant="ghost"
                                        square
                                        size="sm"
                                        aria-label="{{ __('dashboard.Translate') }}"
                                    >
                                        <krikkit:icon name="language" class="size-4" />
                                    </krikkit:button>
                                    <krikkit:button
                                        href="{{ route('dashboard.languages.edit', $language) }}"
                                        variant="ghost"
                                        square
                                        size="sm"
                                        aria-label="{{ __('dashboard.Edit') }}"
                                    >
                                        <krikkit:icon name="pencil" class="size-4" />
                                    </krikkit:button>
                                @endallows
                                @allows('languages.retire')
                                    @unless ($language->is_default)
                                        <krikkit:button
                                            type="button"
                                            variant="ghost"
                                            square
                                            size="sm"
                                            wire:click="askRetire('{{ $language->public_id }}')"
                                            aria-label="{{ __('dashboard.Retire') }}"
                                        >
                                            <krikkit:icon name="trash" class="size-4" />
                                        </krikkit:button>
                                    @endunless
                                @endallows
                            </div>
                        </krikkit:table.cell>
                    </krikkit:table.row>
                @endforeach
            </krikkit:table.rows>
        </krikkit:table>
    @endif

    <krikkit:confirm name="retire-language" :title="__('dashboard.Retire language')" :copy="__('dashboard.Retire this language?')">
        <x-slot:action>
            <krikkit:button type="button" variant="danger" wire:click="confirmPending">
                {{ __('dashboard.Retire') }}
            </krikkit:button>
        </x-slot:action>
    </krikkit:confirm>
</div>
