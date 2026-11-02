<?php

namespace Database\Factories;

use App\Finance\CreditKind;
use App\Models\CreditGrant;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<CreditGrant>
 */
class CreditGrantFactory extends Factory
{
    protected $model = CreditGrant::class;

    public function definition(): array
    {
        return [
            'public_id' => (string) Str::ulid(),
            'user_id' => User::factory(),
            'amount' => 100,
            'kind' => CreditKind::Grant,
            'reason' => 'Manual grant',
        ];
    }
}
