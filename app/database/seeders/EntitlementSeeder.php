<?php

namespace Database\Seeders;

use App\Entitlement\PlanCatalogSync;
use Illuminate\Database\Seeder;

class EntitlementSeeder extends Seeder
{
    public function run(): void
    {
        app(PlanCatalogSync::class)->sync();
    }
}
