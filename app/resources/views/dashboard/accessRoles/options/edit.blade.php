<x-layouts.dashboard
    :title="__('dashboard.Edit').' '.$role->title"
    skeleton="form"
    :breadcrumbs="[
        ['label' => __('dashboard.Roles'), 'href' => route('dashboard.roles.index')],
        ['label' => __('dashboard.Edit'), 'current' => true],
    ]"
>
    <div class="space-y-6">
        <div class="flex items-center gap-3">
            <krikkit:button
                href="{{ route('dashboard.roles.index') }}"
                variant="ghost"
                square
                size="sm"
                aria-label="{{ __('dashboard.Back') }}"
                title="{{ __('dashboard.Back') }}"
            >
                <krikkit:icon name="arrow-left" class="size-4" />
            </krikkit:button>
            <h1 class="text-2xl font-semibold tracking-tight text-krikkit-fg">
                {{ __('dashboard.Edit') }} {{ $role->title }}
            </h1>
        </div>

        <form method="POST" action="{{ route('dashboard.roles.update', $role) }}" class="mx-auto max-w-2xl space-y-6">
            @csrf
            @method('PUT')

            @include('dashboard.accessRoles.options.form', [
                'role' => $role,
                'clusters' => $clusters,
                'selected' => old('abilities', $selected),
            ])

            <div class="flex justify-end">
                <krikkit:button type="submit" size="sm">
                    {{ __('dashboard.Save changes') }}
                </krikkit:button>
            </div>
        </form>
    </div>
</x-layouts.dashboard>
