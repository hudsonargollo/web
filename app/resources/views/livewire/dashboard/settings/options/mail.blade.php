<div class="space-y-8">
    <div>
        <h1 class="text-lg font-semibold tracking-tight text-krikkit-fg">{{ __('dashboard.Settings') }}</h1>
        <p class="mt-0.5 text-xs text-krikkit-muted">
            {{ __('dashboard.From address, SMTP, and a test send.') }}
        </p>
    </div>

    @include('livewire.dashboard.settings.options.nav')

    <form wire:submit="save" class="space-y-10" autocomplete="off">
        <div class="sr-only" aria-hidden="true">
            <input type="text" name="prevent_autofill_user" autocomplete="username" tabindex="-1" value="">
            <input type="password" name="prevent_autofill_pass" autocomplete="current-password" tabindex="-1" value="">
        </div>

        <krikkit:card :padding="false" class="space-y-4 !border-0">
            <p class="text-[11px] font-normal uppercase tracking-[0.16em] text-krikkit-subtle">{{ __('dashboard.Sender') }}</p>

            <krikkit:field :label="__('dashboard.Mailer')">
                <krikkit:select size="md" wire:model.live="mailer" :value="$mailer">
                    @foreach ($mailers as $value => $label)
                        <krikkit:select.option :value="$value" :selected="$mailer === $value">{{ $label }}</krikkit:select.option>
                    @endforeach
                </krikkit:select>
                <x-slot:description>{{ __('dashboard.Log writes messages to the app log instead of sending them.') }}</x-slot:description>
            </krikkit:field>

            <div class="grid gap-4 sm:grid-cols-2">
                <krikkit:field :label="__('dashboard.From name')">
                    <krikkit:input size="md" wire:model="fromName" :placeholder="__('dashboard.Krikkit')" :invalid="$errors->has('fromName')" />
                    @error('fromName')
                        <krikkit:field.error>{{ $message }}</krikkit:field.error>
                    @enderror
                </krikkit:field>
                <krikkit:field :label="__('dashboard.From address')">
                    <krikkit:input size="md" type="email" wire:model="fromAddress" :placeholder="__('dashboard.hello@example.com')" :invalid="$errors->has('fromAddress')" />
                    @error('fromAddress')
                        <krikkit:field.error>{{ $message }}</krikkit:field.error>
                    @enderror
                </krikkit:field>
            </div>

            <krikkit:field :label="__('dashboard.Reply-to')">
                <krikkit:input size="md" type="email" wire:model="replyTo" :placeholder="__('dashboard.hello@example.com')" :invalid="$errors->has('replyTo')" />
                @error('replyTo')
                    <krikkit:field.error>{{ $message }}</krikkit:field.error>
                @enderror
            </krikkit:field>
        </krikkit:card>

        @if ($mailer === 'smtp')
            <krikkit:card :padding="false" class="space-y-4 !border-0">
                <p class="text-[11px] font-normal uppercase tracking-[0.16em] text-krikkit-subtle">{{ __('dashboard.SMTP') }}</p>

                <div class="grid gap-4 sm:grid-cols-2">
                    <krikkit:field :label="__('dashboard.Host')">
                        <krikkit:input size="md" wire:model="host" placeholder="smtp.example.com" :invalid="$errors->has('host')" />
                        @error('host')
                            <krikkit:field.error>{{ $message }}</krikkit:field.error>
                        @enderror
                    </krikkit:field>
                    <krikkit:field :label="__('dashboard.Port')">
                        <krikkit:input size="md" type="number" wire:model="port" :placeholder="__('dashboard.587')" :invalid="$errors->has('port')" />
                        @error('port')
                            <krikkit:field.error>{{ $message }}</krikkit:field.error>
                        @enderror
                    </krikkit:field>
                </div>

                <krikkit:field :label="__('dashboard.Encryption')">
                    <krikkit:select size="md" wire:model="encryption" :value="$encryption">
                        @foreach ($encryptions as $value => $label)
                            <krikkit:select.option :value="$value" :selected="$encryption === $value">{{ $label }}</krikkit:select.option>
                        @endforeach
                    </krikkit:select>
                </krikkit:field>

                <div class="grid gap-4 sm:grid-cols-2">
                    <krikkit:field :label="__('dashboard.Username')">
                        <krikkit:input
                            size="md"
                            wire:model="username"
                            autocomplete="off"
                            data-1p-ignore
                            data-lpignore="true"
                            :placeholder="__('dashboard.SMTP username')"
                            :invalid="$errors->has('username')"
                        />
                        @error('username')
                            <krikkit:field.error>{{ $message }}</krikkit:field.error>
                        @enderror
                    </krikkit:field>
                    <krikkit:field :label="__('dashboard.Password')">
                        <krikkit:input
                            size="md"
                            type="password"
                            wire:model="password"
                            autocomplete="new-password"
                            data-1p-ignore
                            data-lpignore="true"
                            readonly
                            x-on:focus="$el.removeAttribute('readonly')"
                            :placeholder="$hasPassword ? __('dashboard.•••• keep current') : __('dashboard.SMTP password')"
                            :invalid="$errors->has('password')"
                        />
                        @error('password')
                            <krikkit:field.error>{{ $message }}</krikkit:field.error>
                        @enderror
                    </krikkit:field>
                </div>

                @if ($hasPassword)
                    <krikkit:checkbox :label="__('dashboard.Clear stored password')" wire:model="clearPassword" />
                @endif
            </krikkit:card>
        @endif

        <krikkit:card :padding="false" class="space-y-4 !border-0">
            <p class="text-[11px] font-normal uppercase tracking-[0.16em] text-krikkit-subtle">{{ __('dashboard.Test send') }}</p>
            <div class="flex flex-col gap-3 sm:flex-row sm:items-end">
                <krikkit:field :label="__('dashboard.Send a test to')" class="min-w-0 flex-1">
                    <krikkit:input size="md" type="email" wire:model="testRecipient" :placeholder="__('dashboard.you@example.com')" :invalid="$errors->has('testRecipient')" />
                    @error('testRecipient')
                        <krikkit:field.error>{{ $message }}</krikkit:field.error>
                    @enderror
                </krikkit:field>
                <krikkit:button type="button" variant="outline" wire:click="sendTest" wire:loading.attr="disabled">
                    {{ __('dashboard.Send test') }}
                </krikkit:button>
            </div>
        </krikkit:card>

        <div class="flex justify-end">
            <krikkit:button type="submit" wire:loading.attr="disabled">
                {{ __('dashboard.Save changes') }}
            </krikkit:button>
        </div>
    </form>
</div>
