<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('entitlement_plans')) {
            return;
        }

        $pro = DB::table('entitlement_plans')->where('slug', 'pro')->first();
        if ($pro === null) {
            return;
        }

        $monthly = $pro->price_monthly;
        if ($monthly !== null && (float) $monthly > 0) {
            return;
        }

        DB::table('entitlement_plans')->where('id', $pro->id)->update([
            'price_monthly' => 29,
            'price_yearly' => 290,
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        // Prices may have been set by an operator; leave them.
    }
};
