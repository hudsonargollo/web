<?php

namespace App\Support\Workspace;

use App\Ai\Data\ChatRole;
use App\Entitlement\EntitlementGate;
use App\Finance\FinanceSnapshot;
use App\Finance\Money;
use App\Lab\LabTurnHealth;
use App\Models\Invoice;
use App\Models\LabMessage;
use App\Models\LabProject;
use App\Models\User;
use App\Models\UserEntitlement;
use App\Models\UserSession;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

final class WorkspacePulse
{
    public function __construct(
        private FinanceSnapshot $finance,
        private EntitlementGate $entitlements,
    ) {}

    /**
     * @return array{
     *     workspace: bool,
     *     hello: string,
     *     cards: list<array{label: string, value: string, hint: string, href: ?string}>,
     *     chats: Collection<int, LabMessage>,
     *     people: Collection<int, User>,
     *     attentionCount: int,
     *     projects: Collection<int, LabProject>,
     *     projectsHref: string|null,
     *     peopleHref: string|null,
     *     chatHref: string|null,
     *     online: Collection<int, UserSession>,
     *     onlineHref: string|null,
     *     flagged: Collection<int, array{message: LabMessage, kind: 'failed'|'stuck'}>,
     *     turnsHref: string|null,
     *     invoices: Collection<int, Invoice>,
     *     invoicesHref: string|null,
     *     subscriptions: Collection<int, UserEntitlement>,
     *     subscriptionsHref: string|null,
     *     ownPack: array{title: string, remaining: string, hint: string, twoFactor: string}|null
     * }
     */
    public function for(User $user): array
    {
        $workspace = $user->allows('users.browse')
            || $user->allows('projects.browse')
            || $user->allows('finance.browse');

        $turns = $user->allows('projects.browse') ? $this->turns() : ['failed' => [], 'stuck' => []];
        $online = $user->allows('sessions.browse') ? $this->signedIn() : collect();
        $snapshot = $workspace ? null : $this->entitlements->snapshot($user);

        return [
            'workspace' => $workspace,
            'hello' => $this->hello($user),
            'cards' => $workspace ? $this->workspaceCards($user, $turns, $online) : $this->personalCards($snapshot, $user),
            'chats' => $this->chats($user),
            'people' => $user->allows('users.browse') ? $this->people() : collect(),
            'attentionCount' => count($turns['failed']) + count($turns['stuck']),
            'projects' => $this->projects($user),
            'projectsHref' => $user->allows('projects.browse')
                ? route('dashboard.lab.index')
                : null,
            'peopleHref' => $user->allows('users.browse')
                ? route('dashboard.users.index')
                : null,
            'chatHref' => $user->allows('projects.browse')
                ? route('dashboard.lab.index')
                : route('lab'),
            'online' => $online,
            'onlineHref' => $user->allows('sessions.browse')
                ? route('dashboard.sessions.index')
                : null,
            'flagged' => $user->allows('projects.browse') ? $this->flagged($turns) : collect(),
            'turnsHref' => $user->allows('projects.browse')
                ? route('dashboard.lab.turns')
                : null,
            'invoices' => $user->allows('finance.browse')
                ? $this->finance->recentInvoices(5)
                : collect(),
            'invoicesHref' => $user->allows('finance.browse')
                ? route('dashboard.invoices.index')
                : null,
            'subscriptions' => $user->allows('finance.browse')
                ? $this->subscriptions()
                : collect(),
            'subscriptionsHref' => $user->allows('finance.browse')
                ? route('dashboard.finance.subscriptions.index')
                : null,
            'ownPack' => $snapshot === null ? null : $this->ownPack($snapshot, $user),
        ];
    }

    private function hello(User $user): string
    {
        $given = trim(Str::of((string) $user->name)->before(' ')->toString());

        return $given === ''
            ? (string) __('dashboard.Hello')
            : (string) __('dashboard.Hello, :name', ['name' => $given]);
    }

    /**
     * @param  array{failed: list<LabMessage>, stuck: list<LabMessage>}  $turns
     * @param  Collection<int, UserSession>  $online
     * @return list<array{label: string, value: string, hint: string, href: ?string}>
     */
    private function workspaceCards(User $user, array $turns, Collection $online): array
    {
        $cards = [];
        $weekStart = now()->startOfWeek();

        if ($user->allows('users.browse')) {
            $joined = User::query()->where('created_at', '>=', $weekStart)->count();
            $cards[] = [
                'label' => __('dashboard.People'),
                'value' => number_format(User::query()->count()),
                'hint' => __('dashboard.:count joined this week', ['count' => number_format($joined)]),
                'href' => route('dashboard.users.index'),
            ];
        }

        if ($user->allows('projects.browse')) {
            $opened = LabProject::query()->where('created_at', '>=', $weekStart)->count();
            $cards[] = [
                'label' => __('dashboard.Lab'),
                'value' => number_format($this->projectCount()),
                'hint' => __('dashboard.:count opened this week', ['count' => number_format($opened)]),
                'href' => route('dashboard.lab.index'),
            ];

            $chatTotal = $this->chatQuery($user)->count();
            $chatWeek = $this->chatQuery($user)->where('created_at', '>=', $weekStart)->count();
            $cards[] = [
                'label' => __('dashboard.Chat'),
                'value' => number_format($chatTotal),
                'hint' => __('dashboard.:count this week', ['count' => number_format($chatWeek)]),
                'href' => route('dashboard.lab.index'),
            ];
        }

        if ($user->allows('finance.browse')) {
            $finance = $this->finance->cards();
            $cards[] = [
                'label' => __('dashboard.MRR'),
                'value' => Money::format($finance['mrr'], $finance['currency']),
                'hint' => __('dashboard.Active subscriptions.'),
                'href' => route('dashboard.finance.index'),
            ];
            $cards[] = [
                'label' => __('dashboard.Collected this month'),
                'value' => Money::format($finance['collected'], $finance['currency']),
                'hint' => $finance['month'],
                'href' => route('dashboard.invoices.index'),
            ];
        } elseif ($user->allows('projects.browse')) {
            $flagged = count($turns['failed']) + count($turns['stuck']);
            $cards[] = [
                'label' => __('dashboard.Failed turns'),
                'value' => number_format($flagged),
                'hint' => __('dashboard.Failed and stuck assistant turns.'),
                'href' => route('dashboard.lab.turns'),
            ];
        }

        if ($user->allows('sessions.browse')) {
            $cards[] = [
                'label' => __('dashboard.Signed in'),
                'value' => number_format($online->count()),
                'hint' => __('dashboard.Live sessions right now.'),
                'href' => route('dashboard.sessions.index'),
            ];
        }

        return $cards;
    }

    /**
     * @param  array<string, mixed>  $snapshot
     * @return list<array{label: string, value: string, hint: string, href: ?string}>
     */
    private function personalCards(array $snapshot, User $user): array
    {
        $pack = $this->ownPack($snapshot, $user);

        return [
            [
                'label' => __('dashboard.Pack'),
                'value' => $pack['title'],
                'hint' => __('dashboard.Your current plan.'),
                'href' => null,
            ],
            [
                'label' => __('dashboard.This period'),
                'value' => $pack['remaining'],
                'hint' => $pack['hint'],
                'href' => null,
            ],
            [
                'label' => __('dashboard.Projects'),
                'value' => number_format($this->ownProjectCount($user)),
                'hint' => __('dashboard.Sites you have open in Lab.'),
                'href' => route('lab'),
            ],
            [
                'label' => __('dashboard.Two-factor'),
                'value' => $pack['twoFactor'],
                'hint' => $user->hasTwoFactorEnabled()
                    ? __('dashboard.Authenticator app is confirmed.')
                    : __('dashboard.Add an authenticator app under Profile.'),
                'href' => route('dashboard.profile.two-factor'),
            ],
        ];
    }

    /**
     * @param  array<string, mixed>  $snapshot
     * @return array{title: string, remaining: string, hint: string, twoFactor: string}
     */
    private function ownPack(array $snapshot, User $user): array
    {
        $credits = is_array($snapshot['credits'] ?? null) ? $snapshot['credits'] : [];
        $unlimited = (bool) ($credits['unlimited'] ?? false);
        $remaining = $credits['remaining'] ?? null;

        return [
            'title' => (string) ($snapshot['plan']['title'] ?? '—'),
            'remaining' => $unlimited
                ? (string) __('dashboard.Unlimited')
                : number_format((int) $remaining),
            'hint' => $unlimited
                ? (string) __('dashboard.No spend cap on this pack.')
                : (string) __('dashboard.:used used of :limit', [
                    'used' => number_format((int) ($credits['used'] ?? 0)),
                    'limit' => number_format((int) ($credits['limit'] ?? 0)),
                ]),
            'twoFactor' => $user->hasTwoFactorEnabled()
                ? (string) __('dashboard.On')
                : (string) __('dashboard.Off'),
        ];
    }

    /**
     * @return Collection<int, LabMessage>
     */
    private function chats(User $user): Collection
    {
        if (! Schema::hasTable('lab_messages')) {
            return collect();
        }

        return $this->chatQuery($user)
            ->with(['project.user'])
            ->where('content', '!=', '')
            ->orderByDesc('id')
            ->limit(8)
            ->get();
    }

    /**
     * @return Collection<int, User>
     */
    private function people(): Collection
    {
        return User::query()
            ->with('accessRole')
            ->orderByDesc('id')
            ->limit(8)
            ->get();
    }

    /**
     * @return Builder<LabMessage>
     */
    private function chatQuery(User $user): Builder
    {
        $query = LabMessage::query();

        if (! $user->allows('projects.browse')) {
            $query->whereHas(
                'project',
                fn (Builder $project): Builder => $project->where('user_id', $user->id),
            );
        }

        return $query;
    }

    /**
     * @return Collection<int, LabProject>
     */
    private function projects(User $user): Collection
    {
        if (! Schema::hasTable('lab_projects')) {
            return collect();
        }

        $query = LabProject::query()->with('user')->orderByDesc('updated_at')->limit(5);

        if (! $user->allows('projects.browse')) {
            $query->where('user_id', $user->id);
        }

        return $query->get();
    }

    /**
     * @return array{failed: list<LabMessage>, stuck: list<LabMessage>}
     */
    private function turns(): array
    {
        if (! Schema::hasTable('lab_messages')) {
            return ['failed' => [], 'stuck' => []];
        }

        return LabTurnHealth::scan();
    }

    /**
     * @param  array{failed: list<LabMessage>, stuck: list<LabMessage>}  $turns
     * @return Collection<int, array{message: LabMessage, kind: 'failed'|'stuck'}>
     */
    private function flagged(array $turns): Collection
    {
        $rows = [];

        foreach ($turns['failed'] as $message) {
            $rows[] = ['message' => $message, 'kind' => 'failed'];
            if (count($rows) >= 5) {
                return collect($rows);
            }
        }

        foreach ($turns['stuck'] as $message) {
            $rows[] = ['message' => $message, 'kind' => 'stuck'];
            if (count($rows) >= 5) {
                break;
            }
        }

        return collect($rows);
    }

    /**
     * @return Collection<int, UserSession>
     */
    private function signedIn(): Collection
    {
        if (! Schema::hasTable('sessions')) {
            return collect();
        }

        return UserSession::query()
            ->active()
            ->authenticated()
            ->with(['user.accessRole'])
            ->orderByDesc('last_activity')
            ->get()
            ->unique('user_id')
            ->filter(fn (UserSession $row): bool => $row->user !== null)
            ->take(8)
            ->values();
    }

    /**
     * @return Collection<int, UserEntitlement>
     */
    private function subscriptions(): Collection
    {
        if (! Schema::hasTable('user_entitlements')) {
            return collect();
        }

        return UserEntitlement::query()
            ->with(['user', 'plan'])
            ->orderByDesc('id')
            ->limit(5)
            ->get();
    }

    private function projectCount(): int
    {
        if (! Schema::hasTable('lab_projects')) {
            return 0;
        }

        return LabProject::query()->count();
    }

    private function ownProjectCount(User $user): int
    {
        if (! Schema::hasTable('lab_projects')) {
            return 0;
        }

        return LabProject::query()->where('user_id', $user->id)->count();
    }

    public static function snippet(?string $content): string
    {
        $plain = trim(preg_replace('/\s+/', ' ', strip_tags((string) $content)) ?? '');

        return $plain === '' ? '—' : Str::limit($plain, 92);
    }

    public static function speaker(LabMessage $message): string
    {
        if ($message->role === ChatRole::Assistant->value) {
            return (string) __('dashboard.Lab');
        }

        return (string) ($message->project?->user?->name ?: __('dashboard.You'));
    }
}
