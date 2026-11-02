<x-layouts.dashboard
    :title="__('dashboard.New role')"
    skeleton="form"
    :breadcrumbs="[
        ['label' => __('dashboard.Roles'), 'href' => route('dashboard.roles.index')],
        ['label' => __('dashboard.New'), 'current' => true],
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
                {{ __('dashboard.New role') }}
            </h1>
        </div>

        <form method="POST" action="{{ route('dashboard.roles.store') }}" class="mx-auto max-w-2xl space-y-6">
            @csrf

            @include('dashboard.accessRoles.options.form', [
                'clusters' => $clusters,
                'selected' => old('abilities', []),
            ])

            <div class="flex justify-end">
                <krikkit:button type="submit" size="sm">
                    {{ __('dashboard.Create role') }}
                </krikkit:button>
            </div>
        </form>
    </div>
</x-layouts.dashboard>
