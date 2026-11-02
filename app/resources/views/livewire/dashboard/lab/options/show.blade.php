<div class="space-y-8">
    <div class="flex flex-wrap items-end justify-between gap-3">
        <div class="min-w-0">
            <h1 class="text-lg font-semibold tracking-tight text-krikkit-fg">{{ $project->title ?: __('dashboard.Untitled') }}</h1>
            <p class="mt-0.5 text-xs text-krikkit-muted">
                {{ $project->user?->name ?: __('dashboard.Unassigned') }}
                @if ($project->isFrozen())
                    · {{ __('dashboard.Frozen') }}
                @endif
            </p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
            <krikkit:button href="{{ route('lab.show', $project) }}" variant="outline" size="sm">
                <krikkit:icon name="lab" class="size-4" />
                {{ __('dashboard.Open in Lab') }}
            </krikkit:button>
            @allows('projects.revise')
                <krikkit:button type="button" variant="ghost" size="sm" wire:click="askFreeze">
                    {{ $project->isFrozen() ? __('dashboard.Unfreeze') : __('dashboard.Freeze') }}
                </krikkit:button>
            @endallows
            @allows('projects.retire')
                <krikkit:button type="button" variant="danger" size="sm" wire:click="askDelete">
                    {{ __('dashboard.Delete') }}
                </krikkit:button>
            @endallows
        </div>
    </div>

    <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div class="rounded-xl bg-krikkit-surface p-4 sm:p-5">
            <p class="text-[11px] uppercase tracking-[0.16em] text-krikkit-subtle">{{ __('dashboard.Stack') }}</p>
            <p class="mt-2 text-sm text-krikkit-fg">{{ $project->stack ?: '—' }}</p>
            <p class="mt-1 text-[11px] text-krikkit-muted">{{ __('dashboard.Workspace') }} · {{ $project->workspace_status ?: '—' }}</p>
        </div>
        <div class="rounded-xl bg-krikkit-surface p-4 sm:p-5">
            <p class="text-[11px] uppercase tracking-[0.16em] text-krikkit-subtle">{{ __('dashboard.Credits') }}</p>
            <p class="mt-2 text-sm tabular-nums text-krikkit-fg">{{ number_format((int) $project->credits_spent) }}</p>
        </div>
        <div class="rounded-xl bg-krikkit-surface p-4 sm:p-5">
            <p class="text-[11px] uppercase tracking-[0.16em] text-krikkit-subtle">{{ __('dashboard.Messages') }}</p>
            <p class="mt-2 text-sm tabular-nums text-krikkit-fg">{{ number_format($project->messages->count()) }}</p>
        </div>
        <div class="rounded-xl bg-krikkit-surface p-4 sm:p-5">
            <p class="text-[11px] uppercase tracking-[0.16em] text-krikkit-subtle">{{ __('dashboard.Updated') }}</p>
            <p class="mt-2 text-sm text-krikkit-fg">{{ $project->updated_at?->diffForHumans() ?: '—' }}</p>
        </div>
    </div>

    <div class="space-y-4 rounded-xl bg-krikkit-surface p-4 sm:p-5">
        <p class="text-[11px] font-normal uppercase tracking-[0.16em] text-krikkit-subtle">{{ __('dashboard.Owner') }}</p>
        @if ($project->user)
            <div>
                <p class="text-sm text-krikkit-fg">{{ $project->user->name }}</p>
                <p class="text-xs text-krikkit-muted">{{ $project->user->email }}</p>
            </div>
        @else
            <p class="text-sm text-krikkit-muted">{{ __('dashboard.Unassigned') }}</p>
        @endif
        @allows('projects.revise')
            <form wire:submit="saveOwner" class="flex flex-wrap items-end gap-2">
                <krikkit:field :label="__('dashboard.Transfer to')" class="min-w-56 flex-1">
                    <krikkit:select size="md" wire:model="ownerPublicId" :value="$ownerPublicId" searchable>
                        @foreach ($owners as $owner)
                            <krikkit:select.option :value="$owner->public_id" :selected="$ownerPublicId === $owner->public_id">
                                {{ $owner->name }} · {{ $owner->email }}
                            </krikkit:select.option>
                        @endforeach
                    </krikkit:select>
                </krikkit:field>
                <krikkit:button type="submit" size="sm">{{ __('dashboard.Save') }}</krikkit:button>
            </form>
        @endallows
    </div>

    <div class="space-y-3">
        <h2 class="text-sm font-medium text-krikkit-fg">{{ __('dashboard.Messages') }}</h2>
        @if ($project->messages->isEmpty())
            <p class="text-sm text-krikkit-muted">{{ __('dashboard.No messages yet.') }}</p>
        @else
            <div class="space-y-2">
                @foreach ($project->messages as $message)
                    @php
                        $usage = is_array($message->metadata['usage'] ?? null) ? $message->metadata['usage'] : null;
                        $turnStatus = $message->metadata['turnStatus'] ?? null;
                    @endphp
                    <div class="rounded-xl bg-krikkit-surface px-3 py-2.5">
                        <div class="flex flex-wrap items-center gap-2">
                            <krikkit:badge size="xs" :color="$message->role === 'assistant' ? 'blue' : 'zinc'">
                                {{ $message->role === 'assistant' ? __('dashboard.Assistant') : __('dashboard.User') }}
                            </krikkit:badge>
                            @if (filled($turnStatus))
                                <span class="text-[11px] text-krikkit-muted">{{ $turnStatus }}</span>
                            @endif
                            @if (is_array($usage))
                                <span class="text-[11px] text-krikkit-muted">
                                    {{ $usage['model'] ?? '' }}
                                    @if (isset($usage['credits']))
                                        · {{ number_format((int) $usage['credits']) }} {{ __('dashboard.Credits') }}
                                    @endif
                                </span>
                            @endif
                            <span class="ms-auto text-[11px] text-krikkit-subtle">{{ $message->created_at?->diffForHumans() }}</span>
                        </div>
                        @if (filled(trim((string) $message->content)))
                            <p class="mt-1.5 whitespace-pre-wrap break-words text-xs leading-relaxed text-krikkit-fg-soft">{{ \Illuminate\Support\Str::limit(trim($message->content), 480) }}</p>
                        @endif
                    </div>
                @endforeach
            </div>
        @endif
    </div>

    <krikkit:confirm
        name="lab-project-confirm"
        :title="$confirmAction === 'delete' ? __('dashboard.Delete project') : __('dashboard.Freeze project')"
        :copy="$confirmAction === 'delete' ? __('dashboard.Delete this project and its workspace files?') : __('dashboard.Frozen projects cannot chat or write files.')"
    >
        <x-slot:action>
            <krikkit:button type="button" variant="danger" wire:click="confirmPending">
                {{ $confirmAction === 'delete' ? __('dashboard.Delete') : __('dashboard.Freeze') }}
            </krikkit:button>
        </x-slot:action>
    </krikkit:confirm>
</div>
