<x-settings.frame section="general">
    <div class="space-y-8">
        <div>
            <h1 class="text-2xl font-semibold tracking-tight text-krikkit-fg">{{ __('settings.General Settings') }}</h1>
            <p class="mt-1 text-sm text-krikkit-muted">{{ __('settings.Manage your preferences for appearance, notifications, and default Lab behavior.') }}</p>
        </div>

        <div>
            <p class="mb-3 text-sm font-medium text-krikkit-muted">{{ __('settings.Appearance and notifications') }}</p>
            <krikkit:card :padding="false">
                <div class="flex items-start justify-between gap-6 border-b border-krikkit-line px-5 py-5">
                    <div class="min-w-0">
                        <p class="text-sm font-semibold text-krikkit-fg">{{ __('settings.Theme') }}</p>
                        <p class="mt-1 text-sm text-krikkit-muted">{{ __('settings.Sets the interface to light mode, dark mode, or to match your device setting.') }}</p>
                    </div>
                    <div class="w-40 shrink-0">
                        <krikkit:select size="sm" wire:model.live="mode" :value="$mode" :disabled="$themeLocked">
                            <krikkit:select.option value="light" :selected="$mode === 'light'">{{ __('settings.Light') }}</krikkit:select.option>
                            <krikkit:select.option value="dark" :selected="$mode === 'dark'">{{ __('settings.Dark') }}</krikkit:select.option>
                            <krikkit:select.option value="system" :selected="$mode === 'system'">{{ __('settings.System') }}</krikkit:select.option>
                        </krikkit:select>
                    </div>
                </div>
                @if ($themeLocked)
                    <p class="border-b border-krikkit-line px-5 py-3 text-xs text-krikkit-muted">{{ __('settings.The workspace theme is locked. Ask an administrator if you need a different appearance.') }}</p>
                @endif
                <div class="flex items-start justify-between gap-6 border-b border-krikkit-line px-5 py-5">
                    <div class="min-w-0">
                        <p class="text-sm font-semibold text-krikkit-fg">{{ __('settings.Display token usage in chat') }}</p>
                        <p class="mt-1 text-sm text-krikkit-muted">{{ __('settings.Always shows monthly credit balance in Lab when you are in a project.') }}</p>
                    </div>
                    <krikkit:switch wire:model.live="showTokenUsage" :checked="$showTokenUsage" />
                </div>
                <div class="flex items-start justify-between gap-6 px-5 py-5">
                    <div class="min-w-0">
                        <p class="text-sm font-semibold text-krikkit-fg">{{ __('settings.Sound notification') }}</p>
                        <p class="mt-1 text-sm text-krikkit-muted">{{ __('settings.Plays a chime when Lab finishes a turn or needs approval, and only if this tab is in the background.') }}</p>
                    </div>
                    <krikkit:switch wire:model.live="soundAlerts" :checked="$soundAlerts" />
                </div>
            </krikkit:card>
        </div>

        <div>
            <p class="mb-3 text-sm font-medium text-krikkit-muted">{{ __('settings.Chat') }}</p>
            <krikkit:card :padding="false">
                <div class="flex items-start justify-between gap-6 px-5 py-5">
                    <div class="min-w-0">
                        <p class="text-sm font-semibold text-krikkit-fg">{{ __('settings.Default model') }}</p>
                        <p class="mt-1 text-sm text-krikkit-muted">{{ __('settings.Chooses the model to use for new Lab conversations. Open projects keep the model you already selected.') }}</p>
                        @error('defaultModel')
                            <krikkit:field.error>{{ $message }}</krikkit:field.error>
                        @enderror
                    </div>
                    <div class="w-52 shrink-0">
                        <krikkit:select size="sm" wire:model.live="defaultModel" :value="$defaultModel">
                            @foreach ($models as $model)
                                <krikkit:select.option :value="$model->id" :selected="$defaultModel === $model->id">{{ $model->label }}</krikkit:select.option>
                            @endforeach
                        </krikkit:select>
                    </div>
                </div>
            </krikkit:card>
        </div>
    </div>
</x-settings.frame>
