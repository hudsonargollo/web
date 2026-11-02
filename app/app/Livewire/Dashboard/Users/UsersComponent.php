<?php

namespace App\Livewire\Dashboard\Users;

use App\Entitlement\EntitlementCatalog;
use App\Entitlement\EntitlementGate;
use App\Models\User;
use App\Support\Geography\Countries;
use App\Support\Users\UserDirectoryExport;
use Illuminate\Contracts\View\View;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;
use Livewire\Attributes\Layout;
use Livewire\Attributes\Lazy;
use Livewire\Component;
use Symfony\Component\HttpFoundation\StreamedResponse;

#[Lazy]
#[Layout('components.layouts.dashboard', ['skeleton' => 'table'])]
class UsersComponent extends Component
{
    public string $search = '';

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
            'title' => __('dashboard.Users'),
        ];
    }

    public function mount(): void
    {
        Gate::authorize('users.browse');
    }

    public function export(string $format, UserDirectoryExport $exporter, EntitlementGate $entitlements): StreamedResponse
    {
        Gate::authorize('users.browse');

        abort_unless(in_array($format, ['csv', 'tsv', 'json'], true), 404);

        if (in_array($format, ['tsv', 'json'], true)) {
            $user = Auth::user();
            abort_unless($user !== null, 403);

            $entitlements->assertFeature($user, EntitlementCatalog::ADVANCED_EXPORT);
        }

        return $exporter->download($this->usersQuery()->get(), $format);
    }

    public function render(): View
    {
        return view('livewire.dashboard.users.users', [
            'users' => $this->usersQuery()->get(),
            'directoryHasUsers' => User::query()->exists(),
            'canAdvancedExport' => Auth::user()?->entitled(EntitlementCatalog::ADVANCED_EXPORT) ?? false,
        ])->layoutData($this->layoutData());
    }

    /**
     * @return Builder<User>
     */
    protected function usersQuery(): Builder
    {
        $query = User::query()
            ->with(['accessRole', 'entitlement.plan'])
            ->orderBy('name');

        $term = trim($this->search);

        if ($term === '') {
            return $query;
        }

        $like = '%'.$this->escapeLike($term).'%';
        $countryCodes = collect(Countries::options())
            ->filter(fn (string $label): bool => str_contains(mb_strtolower($label), mb_strtolower($term)))
            ->keys()
            ->all();

        return $query->where(function (Builder $builder) use ($like, $term, $countryCodes): void {
            $builder
                ->where('name', 'like', $like)
                ->orWhere('username', 'like', $like)
                ->orWhere('email', 'like', $like)
                ->orWhere('phone', 'like', $like)
                ->orWhere('country', 'like', $like)
                ->orWhere('status', 'like', $like)
                ->orWhereHas(
                    'accessRole',
                    fn (Builder $role): Builder => $role
                        ->where('title', 'like', $like)
                        ->orWhere('slug', 'like', $like),
                );

            if ($countryCodes !== []) {
                $builder->orWhereIn('country', $countryCodes);
            }

            foreach (['active', 'invited', 'disabled'] as $status) {
                if (str_contains($status, mb_strtolower($term))) {
                    $builder->orWhere('status', $status);
                }
            }
        });
    }

    protected function escapeLike(string $value): string
    {
        return str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $value);
    }
}
