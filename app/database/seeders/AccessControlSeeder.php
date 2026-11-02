<?php

namespace Database\Seeders;

use App\Access\AbilityRegistry;
use App\Models\AccessAbility;
use App\Models\AccessRole;
use Illuminate\Database\Seeder;

class AccessControlSeeder extends Seeder
{
    public function run(): void
    {
        $abilities = collect(AbilityRegistry::definitions())
            ->mapWithKeys(function (array $definition) {
                $ability = AccessAbility::query()->updateOrCreate(
                    ['code' => $definition['code']],
                    [
                        'cluster' => $definition['cluster'],
                        'title' => $definition['title'],
                    ]
                );

                return [$definition['code'] => $ability->id];
            });

        AccessAbility::query()
            ->whereNotIn('code', $abilities->keys()->all())
            ->delete();

        $owner = AccessRole::query()->updateOrCreate(
            ['slug' => 'owner'],
            [
                'title' => 'Owner',
                'summary' => 'Full workspace authority. Locked system role.',
                'locked' => true,
            ]
        );

        $member = AccessRole::query()->updateOrCreate(
            ['slug' => 'member'],
            [
                'title' => 'Member',
                'summary' => 'Standard workspace access and personal security.',
                'locked' => false,
            ]
        );

        $owner->abilities()->sync($abilities->values()->all());

        $member->abilities()->sync(
            $abilities->only(['dashboard.access', 'security.self'])->values()->all()
        );
    }
}
