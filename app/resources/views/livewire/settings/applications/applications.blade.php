<x-settings.frame section="applications">
    <div class="space-y-8">
        <div>
            <h1 class="text-2xl font-semibold tracking-tight text-krikkit-fg">{{ __('settings.Applications') }}</h1>
            <p class="mt-1 text-sm text-krikkit-muted">{{ __('settings.Connect other tools to extend what you can build with Krikkit.') }}</p>
        </div>

        <div class="space-y-3">
            <krikkit:card class="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div class="flex min-w-0 flex-1 items-start gap-4">
                    <span class="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-krikkit-line bg-krikkit-soft text-krikkit-fg">
                        <krikkit:icon name="circle-stack" class="size-5" />
                    </span>
                    <div class="min-w-0">
                        <p class="text-[11px] font-semibold uppercase tracking-[0.14em] text-krikkit-subtle">{{ __('settings.Database') }}</p>
                        <p class="mt-1 text-sm font-semibold text-krikkit-fg">Supabase</p>
                        <p class="mt-1 text-sm text-krikkit-muted">{{ __('settings.Connect a database for authentication and data storage.') }}</p>
                    </div>
                </div>
                <div class="shrink-0 sm:self-center">
                    @if ($supabaseLinked)
                        <krikkit:button type="button" variant="outline" x-on:click="$dispatch('krikkit-modal-open', 'unlink-supabase')">{{ __('settings.Disconnect') }}</krikkit:button>
                    @else
                        <krikkit:button :href="$supabaseConnect" :navigate="false" variant="outline">{{ __('settings.Connect') }}</krikkit:button>
                    @endif
                </div>
            </krikkit:card>

            <krikkit:card class="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div class="flex min-w-0 flex-1 items-start gap-4">
                    <span class="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-krikkit-line bg-krikkit-soft text-krikkit-fg">
                        <krikkit:icon name="github" class="size-5" />
                    </span>
                    <div class="min-w-0">
                        <p class="text-[11px] font-semibold uppercase tracking-[0.14em] text-krikkit-subtle">{{ __('settings.Code') }}</p>
                        <p class="mt-1 text-sm font-semibold text-krikkit-fg">GitHub @if ($githubLogin)<span class="font-normal text-krikkit-muted">· {{ $githubLogin }}</span>@endif</p>
                        <p class="mt-1 text-sm text-krikkit-muted">{{ __('settings.Import repositories and push Lab projects from your GitHub account.') }}</p>
                        @if ($githubLinked)
                            <p class="mt-2 text-xs text-krikkit-subtle">{{ __('settings.To revoke GitHub authorization, visit github.com/settings/applications, find Krikkit, and click Revoke.') }}</p>
                        @endif
                    </div>
                </div>
                <div class="shrink-0 sm:self-center">
                    @if ($githubLinked)
                        <krikkit:button type="button" variant="outline" x-on:click="$dispatch('krikkit-modal-open', 'unlink-github')">{{ __('settings.Disconnect') }}</krikkit:button>
                    @else
                        <krikkit:button :href="$githubConnect" :navigate="false" variant="outline">{{ __('settings.Connect') }}</krikkit:button>
                    @endif
                </div>
            </krikkit:card>
        </div>
    </div>

    <krikkit:confirm name="unlink-github" :title="__('settings.Disconnect GitHub')" :copy="__('settings.Disconnect this GitHub account from Krikkit?')">
        <x-slot:action>
            <krikkit:button type="button" variant="danger" wire:click="unlinkGithub">{{ __('settings.Disconnect') }}</krikkit:button>
        </x-slot:action>
    </krikkit:confirm>
    <krikkit:confirm name="unlink-supabase" :title="__('settings.Disconnect Supabase')" :copy="__('settings.Disconnect this Supabase account from Krikkit?')">
        <x-slot:action>
            <krikkit:button type="button" variant="danger" wire:click="unlinkSupabase">{{ __('settings.Disconnect') }}</krikkit:button>
        </x-slot:action>
    </krikkit:confirm>
</x-settings.frame>
