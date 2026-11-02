<?php

namespace App\Http\Controllers\Dashboard;

use App\Access\AbilityRegistry;
use App\Http\Controllers\Controller;
use App\Models\AccessAbility;
use App\Models\AccessRole;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Illuminate\View\View;

class AccessRoleController extends Controller
{
    public function index(): View
    {
        return view('dashboard.accessRoles.accessRoles', [
            'roles' => AccessRole::query()
                ->withCount(['abilities', 'holders'])
                ->orderBy('title')
                ->get(),
        ]);
    }

    public function create(): View
    {
        return view('dashboard.accessRoles.options.create', [
            'clusters' => $this->abilityClusters(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $this->validatedPayload($request);

        $role = AccessRole::query()->create([
            'slug' => Str::slug($validated['title']).'-'.Str::lower(Str::random(4)),
            'title' => $validated['title'],
            'summary' => $validated['summary'] ?? null,
            'locked' => false,
        ]);

        $role->abilities()->sync($this->abilityIds($validated['abilities'] ?? []));

        return redirect()
            ->route('dashboard.roles.index')
            ->with('status', 'role-created');
    }

    public function edit(AccessRole $accessRole): View
    {
        $this->guardMutableRole($accessRole);

        $accessRole->load('abilities');

        return view('dashboard.accessRoles.options.edit', [
            'role' => $accessRole,
            'clusters' => $this->abilityClusters(),
            'selected' => $accessRole->abilities->pluck('code')->all(),
        ]);
    }

    public function update(Request $request, AccessRole $accessRole): RedirectResponse
    {
        $this->guardMutableRole($accessRole);

        $validated = $this->validatedPayload($request, $accessRole);

        $accessRole->update([
            'title' => $validated['title'],
            'summary' => $validated['summary'] ?? null,
        ]);

        $accessRole->abilities()->sync($this->abilityIds($validated['abilities'] ?? []));

        return redirect()
            ->route('dashboard.roles.index')
            ->with('status', 'role-updated');
    }

    public function destroy(AccessRole $accessRole): RedirectResponse
    {
        $this->guardMutableRole($accessRole);

        if ($accessRole->holders()->exists()) {
            throw ValidationException::withMessages([
                'role' => __('dashboard.Reassign users before retiring this role.'),
            ]);
        }

        $accessRole->delete();

        return redirect()
            ->route('dashboard.roles.index')
            ->with('status', 'role-retired');
    }

    private function guardMutableRole(AccessRole $accessRole): void
    {
        if ($accessRole->locked) {
            abort(404);
        }
    }

    private function validatedPayload(Request $request, ?AccessRole $role = null): array
    {
        return $request->validate([
            'title' => ['required', 'string', 'max:120'],
            'summary' => ['nullable', 'string', 'max:255'],
            'abilities' => ['nullable', 'array'],
            'abilities.*' => ['string', Rule::in(AbilityRegistry::codes())],
        ]);
    }

    /**
     * @param  list<string>  $codes
     * @return list<int>
     */
    private function abilityIds(array $codes): array
    {
        return AccessAbility::query()
            ->whereIn('code', $codes)
            ->pluck('id')
            ->all();
    }

    /**
     * @return array<string, Collection<int, AccessAbility>>
     */
    private function abilityClusters(): array
    {
        $codeOrder = collect(AbilityRegistry::definitions())
            ->pluck('code')
            ->flip();

        $clusterOrder = collect(AbilityRegistry::definitions())
            ->pluck('cluster')
            ->unique()
            ->flip();

        return AccessAbility::query()
            ->get()
            ->sortBy(fn (AccessAbility $ability) => [
                $clusterOrder->get($ability->cluster, PHP_INT_MAX),
                $codeOrder->get($ability->code, PHP_INT_MAX),
            ])
            ->groupBy('cluster')
            ->all();
    }
}
