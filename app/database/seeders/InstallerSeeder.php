<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class InstallerSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            AccessControlSeeder::class,
            EntitlementSeeder::class,
            LanguageSeeder::class,
        ]);
    }
}
