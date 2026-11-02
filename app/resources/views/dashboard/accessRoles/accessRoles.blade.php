<x-layouts.dashboard :title="__('dashboard.Access roles')" skeleton="table">
    <div class="space-y-8">
        <div class="flex flex-wrap items-end justify-between gap-3">
            <div class="min-w-0">
                <h1 class="text-lg font-semibold tracking-tight text-krikkit-fg">{{ __('dashboard.Roles') }}</h1>
                <p class="mt-0.5 text-xs text-krikkit-muted">{{ __('dashboard.Define who can act in the workspace.') }}</p>
            </div>
            @allows('roles.compose')
                <krikkit:button
                    href="{{ route('dashboard.roles.create') }}"
                    variant="ghost"
                    square
                    size="sm"
                    aria-label="{{ __('dashboard.New role') }}"
                    title="{{ __('dashboard.New role') }}"
                >
                    <krikkit:icon name="plus" class="size-4" />
                </krikkit:button>
            @endallows
        </div>

        @if ($roles->isEmpty())
            <p class="text-sm text-krikkit-muted">{{ __('dashboard.No roles yet.') }}</p>
        @else
            <krikkit:table>
                <krikkit:table.columns>
                    <krikkit:table.column>{{ __('dashboard.Role') }}</krikkit:table.column>
                    <krikkit:table.column>{{ __('dashboard.Summary') }}</krikkit:table.column>
                    <krikkit:table.column>{{ __('dashboard.Abilities') }}</krikkit:table.column>
                    <krikkit:table.column>{{ __('dashboard.Users') }}</krikkit:table.column>
                    <krikkit:table.column>{{ __('dashboard.Slug') }}</krikkit:table.column>
                    <krikkit:table.column align="right"></krikkit:table.column>
                </krikkit:table.columns>
                <krikkit:table.rows>
                    @foreach ($roles as $role)
                        <krikkit:table.row>
                            <krikkit:table.cell>
                                <div class="flex min-w-0 items-center gap-2">
                                    <p class="truncate text-xs font-medium text-krikkit-fg">{{ $role->title }}</p>
                                    @if ($role->locked)
                                        <krikkit:badge size="xs">{{ __('dashboard.Locked') }}</krikkit:badge>
                                    @endif
                                </div>
                            </krikkit:table.cell>
                            <krikkit:table.cell>
                                <span class="text-krikkit-fg-soft">{{ $role->summary ?: '—' }}</span>
                            </krikkit:table.cell>
                            <krikkit:table.cell>
                                <span class="text-krikkit-muted">{{ $role->abilities_count }}</span>
                            </krikkit:table.cell>
                            <krikkit:table.cell>
                                <span class="text-krikkit-muted">{{ $role->holders_count }}</span>
                            </krikkit:table.cell>
                            <krikkit:table.cell>
                                <span class="text-krikkit-muted">{{ $role->slug }}</span>
                            </krikkit:table.cell>
                            <krikkit:table.cell align="right">
                                <div class="inline-flex items-center gap-1">
                                    @allows('roles.revise')
                                        @unless ($role->locked)
                                            <krikkit:button
                                                href="{{ route('dashboard.roles.edit', $role) }}"
                                                variant="ghost"
                                                square
                                                size="sm"
                                                aria-label="{{ __('dashboard.Edit') }}"
                                                title="{{ __('dashboard.Edit') }}"
                                            >
                                                <krikkit:icon name="pencil" class="size-4" />
                                            </krikkit:button>
                                        @endunless
                                    @endallows
                                    @allows('roles.retire')
                                        @unless ($role->locked)
                                            <krikkit:button
                                                type="button"
                                                variant="ghost"
                                                square
                                                size="sm"
                                                aria-label="{{ __('dashboard.Retire') }}"
                                                title="{{ __('dashboard.Retire') }}"
                                                @click="$dispatch('krikkit-modal-open', { name: 'retire-role', url: @js(route('dashboard.roles.destroy', $role)) })"
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

        <krikkit:confirm name="retire-role" :title="__('dashboard.Retire role')" :copy="__('dashboard.Retire this role?')">
            <x-slot:action>
                <form method="POST" x-bind:action="payload?.url ?? ''">
                    @csrf
                    @method('DELETE')
                    <krikkit:button type="submit" variant="danger">{{ __('dashboard.Retire') }}</krikkit:button>
                </form>
            </x-slot:action>
        </krikkit:confirm>
    </div>
</x-layouts.dashboard>
