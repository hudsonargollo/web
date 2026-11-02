@php
    $avatarName = $username !== '' ? $username : __('dashboard.User');
    $avatarSrc = $avatar
        ? $avatar->temporaryUrl()
        : ($removeAvatar ? null : $avatarPreviewUrl);
    $hasAvatar = filled($avatarSrc);
@endphp

<div class="space-y-8">
    <div>
        <h1 class="text-lg font-semibold tracking-tight text-krikkit-fg">{{ __('dashboard.Profile') }}</h1>
        <p class="mt-0.5 text-xs text-krikkit-muted">{{ __('dashboard.Your name, password, and two-factor.') }}</p>
    </div>

    @include('livewire.dashboard.profile.options.nav')

    <form wire:submit="save" class="space-y-10">
        <krikkit:card :padding="false" class="!border-0">
            <p class="mb-4 text-[11px] font-normal uppercase tracking-[0.16em] text-krikkit-subtle">{{ __('dashboard.Photo') }}</p>
            <div class="flex flex-col items-start gap-2">
                <div class="relative inline-flex">
                    <label class="group relative cursor-pointer">
                        <krikkit:avatar :name="$avatarName" :src="$avatarSrc" size="xl" />
                        <span
                            class="pointer-events-none absolute inset-0 flex items-center justify-center rounded-full bg-black/45 text-white opacity-0 transition group-hover:opacity-100"
                            aria-hidden="true"
                        >
                            <krikkit:icon name="arrow-up-tray" class="size-6" />
                        </span>
                        <span class="sr-only">{{ __('dashboard.Upload photo') }}</span>
                        <input type="file" class="sr-only" accept="image/*" wire:model="avatar">
                    </label>
                    @if ($hasAvatar)
                        <button
                            type="button"
                            wire:click="clearAvatar"
                            class="absolute -right-0.5 -top-0.5 inline-flex size-6 items-center justify-center rounded-full border border-krikkit-line/50 bg-krikkit-canvas text-krikkit-fg transition hover:bg-krikkit-soft"
                            title="{{ __('dashboard.Remove photo') }}"
                            aria-label="{{ __('dashboard.Remove photo') }}"
                        >
                            <krikkit:icon name="x-mark" class="size-3.5" />
                        </button>
                    @endif
                </div>
                @error('avatar')
                    <krikkit:field.error>{{ $message }}</krikkit:field.error>
                @enderror
            </div>
        </krikkit:card>

        <krikkit:card :padding="false" class="space-y-4 !border-0">
            <p class="text-[11px] font-normal uppercase tracking-[0.16em] text-krikkit-subtle">{{ __('dashboard.Identity') }}</p>
            <p class="text-xs text-krikkit-muted">{{ $roleTitle }}</p>

            <krikkit:field :label="__('dashboard.Username')">
                <krikkit:input size="md" wire:model="username" autocomplete="username" :placeholder="__('dashboard.jane')" :invalid="$errors->has('username')" />
                @error('username')
                    <krikkit:field.error>{{ $message }}</krikkit:field.error>
                @enderror
            </krikkit:field>

            <div class="grid gap-4 sm:grid-cols-2">
                <krikkit:field :label="__('dashboard.Email')">
                    <krikkit:input size="md" wire:model="email" type="email" autocomplete="email" :placeholder="__('dashboard.you@example.com')" :invalid="$errors->has('email')" />
                    @error('email')
                        <krikkit:field.error>{{ $message }}</krikkit:field.error>
                    @enderror
                </krikkit:field>
                <krikkit:field :label="__('dashboard.Phone')">
                    <krikkit:input size="md" wire:model="phone" type="tel" autocomplete="tel" :placeholder="__('dashboard.+1 555 0100')" :invalid="$errors->has('phone')" />
                    @error('phone')
                        <krikkit:field.error>{{ $message }}</krikkit:field.error>
                    @enderror
                </krikkit:field>
            </div>

            <krikkit:field :label="__('dashboard.Country')">
                <krikkit:select
                    size="md"
                    wire:model="country"
                    :value="$country"
                    searchable
                    placeholder="{{ __('dashboard.Choose…') }}"
                    :invalid="$errors->has('country')"
                >
                    <krikkit:select.option value="" :selected="$country === ''">{{ __('dashboard.Choose…') }}</krikkit:select.option>
                    @foreach ($countries as $code => $label)
                        <krikkit:select.option :value="$code" :selected="$country === $code">{{ $label }}</krikkit:select.option>
                    @endforeach
                </krikkit:select>
                @error('country')
                    <krikkit:field.error>{{ $message }}</krikkit:field.error>
                @enderror
            </krikkit:field>
        </krikkit:card>

        <div class="flex justify-end">
            <krikkit:button type="submit" wire:loading.attr="disabled">
                {{ __('dashboard.Save changes') }}
            </krikkit:button>
        </div>
    </form>
</div>
