<?php

namespace Database\Factories;

use App\Models\BlogPost;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<BlogPost>
 */
class BlogPostFactory extends Factory
{
    public function definition(): array
    {
        $title = fake()->unique()->sentence(4);

        return [
            'public_id' => (string) Str::ulid(),
            'slug' => Str::slug($title).'-'.Str::lower(Str::random(4)),
            'title' => $title,
            'excerpt' => fake()->sentence(),
            'body' => '<p>'.fake()->paragraph().'</p>',
            'published' => false,
            'published_on' => null,
        ];
    }

    public function released(): static
    {
        return $this->state(fn (array $attributes) => [
            'published' => true,
            'published_on' => now()->toDateString(),
        ]);
    }
}
