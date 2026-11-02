@allows('security.self')
    <krikkit:dropdown.item href="{{ route('settings.index') }}" wire:navigate icon="cog-6-tooth" x-on:click="open = false">
        {{ __('settings.Settings') }}
    </krikkit:dropdown.item>
    <krikkit:dropdown.item href="{{ route('settings.profile') }}" wire:navigate icon="user" x-on:click="open = false">
        {{ __('settings.Profile') }}
    </krikkit:dropdown.item>
    <krikkit:dropdown.item href="{{ route('settings.password') }}" wire:navigate icon="key" x-on:click="open = false">
        {{ __('dashboard.Change password') }}
    </krikkit:dropdown.item>
    <krikkit:dropdown.item href="{{ route('settings.two-factor') }}" wire:navigate icon="lock-closed" x-on:click="open = false">
        {{ __('settings.Two-factor') }}
    </krikkit:dropdown.item>
    <div class="my-1 border-t border-krikkit-line/60" role="separator"></div>
@endallows
<form method="POST" action="{{ route('logout') }}">
    @csrf
    <krikkit:dropdown.item type="submit" danger icon="arrow-right-start-on-rectangle">
        {{ __('dashboard.Log out') }}
    </krikkit:dropdown.item>
</form>
