<?php

namespace Database\Factories;

use App\Models\Language;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Language>
 */
class LanguageFactory extends Factory
{
    public function definition(): array
    {
        return [
            'public_id' => (string) Str::ulid(),
            'code' => fake()->unique()->regexify('[a-z]{2}'),
            'name' => fake()->unique()->country(),
            'native_name' => fake()->word(),
            'direction' => 'ltr',
            'enabled' => true,
            'is_default' => false,
        ];
    }

    public function english(): static
    {
        return $this->state(fn (array $attributes): array => [
            'code' => 'en',
            'name' => 'English',
            'native_name' => 'English',
            'direction' => 'ltr',
            'enabled' => true,
            'is_default' => true,
        ]);
    }

    public function spanish(): static
    {
        return $this->state(fn (array $attributes): array => [
            'code' => 'es',
            'name' => 'Spanish',
            'native_name' => 'Espanol',
            'direction' => 'ltr',
            'enabled' => true,
            'is_default' => false,
        ]);
    }
}
