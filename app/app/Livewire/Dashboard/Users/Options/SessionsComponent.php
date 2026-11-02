<?php

namespace App\Livewire\Dashboard\Users\Options;

use App\Models\User;
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
    public User $user;

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

    public function mount(User $user): void
    {
        Gate::authorize('sessions.browse');

        $this->user = $user;
    }

    public function render(): View
    {
        return view('livewire.dashboard.users.options.sessions', [
            'sessions' => UserSession::query()
                ->where('user_id', $this->user->id)
                ->active()
                ->with(['user.accessRole'])
                ->orderByDesc('last_activity')
                ->get(),
        ])->layoutData($this->layoutData());
    }
}
