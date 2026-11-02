<div class="space-y-8">
    <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
            <h1 class="text-lg font-semibold tracking-tight text-krikkit-fg">{{ $contact->name }}</h1>
            <p class="mt-0.5 text-xs text-krikkit-muted">{{ $contact->email }}</p>
        </div>
        @allows('contacts.revise')
            <krikkit:button type="button" variant="ghost" wire:click="askRemove">{{ __('dashboard.Remove') }}</krikkit:button>
        @endallows
    </div>

    <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <krikkit:card>
            <p class="text-[11px] uppercase tracking-[0.16em] text-krikkit-subtle">{{ __('dashboard.Status') }}</p>
            <div class="mt-2">
                @if ($contact->isReplied())
                    <krikkit:badge color="green" size="xs">{{ __('dashboard.Replied') }}</krikkit:badge>
                @elseif ($contact->isUnread())
                    <krikkit:badge color="amber" size="xs">{{ __('dashboard.Unread') }}</krikkit:badge>
                @else
                    <krikkit:badge size="xs">{{ __('dashboard.Open') }}</krikkit:badge>
                @endif
            </div>
        </krikkit:card>
        <krikkit:card>
            <p class="text-[11px] uppercase tracking-[0.16em] text-krikkit-subtle">{{ __('dashboard.Pack') }}</p>
            <p class="mt-2 text-sm text-krikkit-fg">{{ $contact->plan?->title ?: '—' }}</p>
        </krikkit:card>
        <krikkit:card>
            <p class="text-[11px] uppercase tracking-[0.16em] text-krikkit-subtle">{{ __('dashboard.Received') }}</p>
            <p class="mt-2 text-sm text-krikkit-fg">{{ $contact->created_at?->format('M j, Y H:i') ?: '—' }}</p>
        </krikkit:card>
        <krikkit:card>
            <p class="text-[11px] uppercase tracking-[0.16em] text-krikkit-subtle">{{ __('dashboard.Replied') }}</p>
            <p class="mt-2 text-sm text-krikkit-fg">{{ $contact->replied_at?->format('M j, Y H:i') ?: '—' }}</p>
        </krikkit:card>
    </div>

    <krikkit:card class="space-y-3">
        <p class="text-[11px] font-normal uppercase tracking-[0.16em] text-krikkit-subtle">{{ __('dashboard.Message') }}</p>
        <p class="whitespace-pre-wrap text-sm leading-relaxed text-krikkit-fg">{{ $contact->body }}</p>
    </krikkit:card>

    @if ($contact->isReplied())
        <krikkit:card class="space-y-3">
            <p class="text-[11px] font-normal uppercase tracking-[0.16em] text-krikkit-subtle">{{ __('dashboard.Your reply') }}</p>
            <p class="whitespace-pre-wrap text-sm leading-relaxed text-krikkit-fg">{{ $contact->reply_body }}</p>
            @if ($contact->repliedBy)
                <p class="text-xs text-krikkit-muted">{{ $contact->repliedBy->name }}</p>
            @endif
        </krikkit:card>
    @endif

    @allows('contacts.revise')
        <form wire:submit="send" class="space-y-4">
            <krikkit:field :label="$contact->isReplied() ? __('dashboard.Send another reply') : __('dashboard.Reply')">
                <krikkit:textarea rows="8" wire:model="reply" :placeholder="__('dashboard.Write a reply…')" :invalid="$errors->has('reply')" />
                @error('reply')
                    <krikkit:field.error>{{ $message }}</krikkit:field.error>
                @enderror
            </krikkit:field>
            <krikkit:button type="submit">{{ __('dashboard.Send reply') }}</krikkit:button>
        </form>
    @endallows

    <krikkit:confirm name="remove-contact" :title="__('dashboard.Remove contact')" :copy="__('dashboard.Remove this note from the inbox?')">
        <x-slot:action>
            <krikkit:button type="button" variant="danger" wire:click="confirmPending">
                {{ __('dashboard.Remove') }}
            </krikkit:button>
        </x-slot:action>
    </krikkit:confirm>
</div>
