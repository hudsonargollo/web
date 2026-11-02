<x-layouts.app>
    <div class="flex min-h-screen items-center justify-center bg-krikkit-canvas px-4">
        @if ($ok)
            <krikkit:empty
                :icon="false"
                :title="__('dashboard.Thank you')"
                :copy="__('dashboard.Your pack is ready. We are glad you are here.')"
            >
                <div class="flex flex-wrap items-center justify-center gap-2">
                    <krikkit:button :href="route('settings.subscription')" :navigate="false">
                        {{ __('settings.Manage subscription') }}
                    </krikkit:button>
                    <krikkit:button :href="route('home')" :navigate="false" variant="outline">
                        {{ __('dashboard.Back to Studio') }}
                    </krikkit:button>
                </div>
            </krikkit:empty>
        @else
            <krikkit:empty
                :title="__('dashboard.No worries')"
                :copy="__('dashboard.Nothing was charged. Come back and pick a pack whenever you like.')"
            >
                <krikkit:button :href="route('pricing')" :navigate="false">
                    {{ __('dashboard.See packs') }}
                </krikkit:button>
            </krikkit:empty>
        @endif
    </div>
</x-layouts.app>
