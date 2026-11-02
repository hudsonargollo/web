<krikkit:modal name="rename-project" size="sm">
    <krikkit:modal.close />
    <h3 class="pr-8 text-lg font-semibold text-krikkit-fg">{{ __('studio.Rename') }}</h3>
    <form wire:submit="saveRename" class="mt-4">
        <krikkit:field :label="__('studio.Name')">
            <krikkit:input wire:model="renameTitle" maxlength="120" :invalid="$errors->has('renameTitle')" autofocus />
            @error('renameTitle')
                <p class="text-xs text-red-600">{{ $message }}</p>
            @enderror
        </krikkit:field>
        <div class="mt-5 flex justify-end gap-2">
            <krikkit:button type="button" variant="ghost" @click="$dispatch('krikkit-modal-close', 'rename-project')">
                {{ __('dashboard.Cancel') }}
            </krikkit:button>
            <krikkit:button type="submit">{{ __('studio.Save') }}</krikkit:button>
        </div>
    </form>
</krikkit:modal>

<krikkit:confirm name="delete-project" :title="__('studio.Delete project')" :copy="__('studio.Delete this project? This cannot be undone.')">
    <x-slot:action>
        <krikkit:button type="button" variant="danger" wire:click="confirmDelete">
            {{ __('studio.Delete') }}
        </krikkit:button>
    </x-slot:action>
</krikkit:confirm>
