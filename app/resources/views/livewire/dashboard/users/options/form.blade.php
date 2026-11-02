@props([
    'roles',
    'countries',
    'statuses',
    'plans' => [],
    'mode' => 'create',
])

@php
    $isEdit = $mode === 'edit';
    $avatarName = $username !== '' ? $username : __('dashboard.User');
    $avatarSrc = $avatar
        ? $avatar->temporaryUrl()
        : ($removeAvatar ? null : $avatarPreviewUrl);
    $hasAvatar = filled($avatarSrc);
    $passwordPlaceholder = $isEdit ? __('dashboard.Leave blank to keep') : __('dashboard.••••••••');
@endphp

<div class="space-y-10">
    {{-- Profile --}}
    <krikkit:card :padding="false" class="!border-0">
        <p class="mb-4 text-[11px] font-normal uppercase tracking-[0.16em] text-krikkit-subtle">{{ __('dashboard.Profile') }}</p>
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

    {{-- Identity --}}
    <krikkit:card :padding="false" class="space-y-4 !border-0">
        <p class="mb-4 text-[11px] font-normal uppercase tracking-[0.16em] text-krikkit-subtle">{{ __('dashboard.Identity') }}</p>

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

    {{-- Password --}}
    <krikkit:card :padding="false" class="space-y-4 !border-0">
        <p class="text-[11px] font-normal uppercase tracking-[0.16em] text-krikkit-subtle">{{ __('dashboard.Password') }}</p>
        <div class="grid gap-4 sm:grid-cols-2">
            <krikkit:field :label="__('dashboard.Password')">
                <krikkit:input
                    size="md"
                    type="password"
                    wire:model="password"
                    autocomplete="new-password"
                    :invalid="$errors->has('password')"
                    :placeholder="$passwordPlaceholder"
                />
                @error('password')
                    <krikkit:field.error>{{ $message }}</krikkit:field.error>
                @enderror
            </krikkit:field>
            <krikkit:field :label="__('dashboard.Confirm password')">
                <krikkit:input
                    size="md"
                    type="password"
                    wire:model="password_confirmation"
                    autocomplete="new-password"
                    :invalid="$errors->has('password_confirmation')"
                    :placeholder="__('dashboard.••••••••')"
                />
                @error('password_confirmation')
                    <krikkit:field.error>{{ $message }}</krikkit:field.error>
                @enderror
            </krikkit:field>
        </div>
    </krikkit:card>

    {{-- Access --}}
    <krikkit:card :padding="false" class="space-y-4 !border-0">
        <p class="text-[11px] font-normal uppercase tracking-[0.16em] text-krikkit-subtle">{{ __('dashboard.Access') }}</p>
        <div class="grid gap-4 sm:grid-cols-2">
            <krikkit:field :label="__('dashboard.Role')">
                <krikkit:select size="md" wire:model="accessRoleId" :value="$accessRoleId" placeholder="{{ __('dashboard.Choose…') }}" :invalid="$errors->has('accessRoleId')">
                    @foreach ($roles as $role)
                        <krikkit:select.option :value="(string) $role->id" :selected="$accessRoleId === (string) $role->id">
                            {{ $role->title }}
                        </krikkit:select.option>
                    @endforeach
                </krikkit:select>
                @error('accessRoleId')
                    <krikkit:field.error>{{ $message }}</krikkit:field.error>
                @enderror
            </krikkit:field>

            <krikkit:field :label="__('dashboard.Status')">
                <krikkit:select size="md" wire:model="status" :value="$status" placeholder="{{ __('dashboard.Choose…') }}" :invalid="$errors->has('status')">
                    @foreach ($statuses as $statusOption)
                        <krikkit:select.option :value="$statusOption->value" :selected="$status === $statusOption->value">
                            {{ $statusOption->label() }}
                        </krikkit:select.option>
                    @endforeach
                </krikkit:select>
                @error('status')
                    <krikkit:field.error>{{ $message }}</krikkit:field.error>
                @enderror
            </krikkit:field>
        </div>

        <krikkit:field :label="__('dashboard.Pack')">
            <krikkit:select size="md" wire:model="planPublicId" :value="$planPublicId" placeholder="{{ __('dashboard.Choose…') }}" :invalid="$errors->has('planPublicId')">
                @foreach ($plans as $plan)
                    <krikkit:select.option :value="$plan->public_id" :selected="$planPublicId === $plan->public_id">
                        {{ $plan->title }}{{ $plan->isLocked() ? ' ('.__('dashboard.Locked').')' : '' }}
                    </krikkit:select.option>
                @endforeach
            </krikkit:select>
            @error('planPublicId')
                <krikkit:field.error>{{ $message }}</krikkit:field.error>
            @enderror
        </krikkit:field>
    </krikkit:card>
</div>
