<?php

namespace App\Livewire\Dashboard\Sessions;

use App\Models\UserSession;
use Illuminate\Contracts\View\View;
use Illuminate\Support\Facades\Gate;
use Livewire\Attributes\Layout;
use Livewire\Attributes\Lazy;
use Livewire\Component;

#[Lazy]
#[Layout('components.layouts.dashboard', ['skeleton' => 'table'])]
class SessionsComponent extends Component
{
    public function placeholder(): View
    {
        return view('components.dashboard.livewirePlaceholder', ['variant' => 'table'])
            ->layoutData($this->layoutData());
    }

    /**
     * @return array{title: string}
     */
    public function layoutData(): array
    {
        return [
            'title' => __('dashboard.Sessions'),
        ];
    }

    public function mount(): void
    {
        Gate::authorize('sessions.browse');
    }

    public function render(): View
    {
        return view('livewire.dashboard.sessions.sessions', [
            'sessions' => UserSession::query()
                ->authenticated()
                ->active()
                ->with(['user.accessRole'])
                ->orderByDesc('last_activity')
                ->get(),
        ])->layoutData($this->layoutData());
    }
}
