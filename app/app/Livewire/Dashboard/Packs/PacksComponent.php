<?php

namespace App\Livewire\Dashboard\Packs;

use App\Models\EntitlementPlan;
use App\Support\Ui\Pulse;
use Illuminate\Contracts\View\View;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;
use Livewire\Attributes\Layout;
use Livewire\Component;

#[Layout('components.layouts.dashboard', ['skeleton' => 'table'])]
class PacksComponent extends Component
{
    public string $confirmAction = '';

    public string $confirmPublicId = '';

    /**
     * @return array{title: string}
     */
    public function layoutData(): array
    {
        return [
            'title' => __('dashboard.Packs'),
        ];
    }

    public function mount(): void
    {
        Gate::authorize('packs.browse');
    }

    public function askLock(string $publicId): void
    {
        Gate::authorize('packs.revise');

        $pack = EntitlementPlan::query()->where('public_id', $publicId)->firstOrFail();

        if ($pack->isLocked()) {
            $this->toggleLock($publicId);

            return;
        }

        $this->queueConfirm('lock', $publicId);
    }

    public function askRetire(string $publicId): void
    {
        Gate::authorize('packs.retire');
        $this->queueConfirm('retire', $publicId);
    }

    public function confirmPending(): void
    {
        $action = $this->confirmAction;
        $publicId = $this->confirmPublicId;
        $this->reset('confirmAction', 'confirmPublicId');
        $this->closeConfirm();

        match ($action) {
            'lock' => $this->toggleLock($publicId),
            'retire' => $this->retire($publicId),
            default => null,
        };
    }

    public function toggleLock(string $publicId): void
    {
        Gate::authorize('packs.revise');

        $pack = EntitlementPlan::query()->where('public_id', $publicId)->firstOrFail();

        if ($pack->is_default && $pack->is_active) {
            throw ValidationException::withMessages([
                'lock' => __('dashboard.The default pack cannot be locked.'),
            ]);
        }

        $pack->update(['is_active' => ! $pack->is_active]);

        $this->pulseOk(
            $pack->is_active
                ? __('dashboard.Pack unlocked.')
                : __('dashboard.Pack locked.')
        );
    }

    public function retire(string $publicId): void
    {
        Gate::authorize('packs.retire');

        $pack = EntitlementPlan::query()->where('public_id', $publicId)->firstOrFail();

        if ($pack->isBuiltIn()) {
            throw ValidationException::withMessages([
                'retire' => __('dashboard.Built-in packs cannot be retired.'),
            ]);
        }

        if ($pack->is_default) {
            throw ValidationException::withMessages([
                'retire' => __('dashboard.The default pack cannot be retired.'),
            ]);
        }

        if ($pack->entitlements()->exists()) {
            throw ValidationException::withMessages([
                'retire' => __('dashboard.Move holders off this pack before retiring it.'),
            ]);
        }

        $pack->delete();
        $this->pulseOk(__('dashboard.Pack retired.'));
    }

    private function queueConfirm(string $action, string $publicId): void
    {
        $this->confirmAction = $action;
        $this->confirmPublicId = $publicId;
        $this->js("window.dispatchEvent(new CustomEvent('krikkit-modal-open', { detail: 'pack-confirm' }))");
    }

    private function closeConfirm(): void
    {
        $this->js("window.dispatchEvent(new CustomEvent('krikkit-modal-close', { detail: 'pack-confirm' }))");
    }

    public function render(): View
    {
        return view('livewire.dashboard.packs.packs', [
            'packs' => EntitlementPlan::query()
                ->with('grants')
                ->withCount('entitlements')
                ->orderBy('rank')
                ->get(),
        ])->layoutData($this->layoutData());
    }

    private function pulseOk(string $copy): void
    {
        $packet = Pulse::craft($copy, __('dashboard.Saved'), 'ok');
        $this->js(
            'window.dispatchEvent(new CustomEvent('.json_encode(Pulse::EVENT).', { detail: '.json_encode($packet).' }))'
        );
    }
}
