<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('entitlement_plans', function (Blueprint $table) {
            $table->decimal('price_monthly', 10, 2)->nullable()->after('rank');
            $table->decimal('price_yearly', 10, 2)->nullable()->after('price_monthly');
            $table->string('currency', 3)->default('USD')->after('price_yearly');
        });

        if (Schema::hasTable('entitlement_plans')) {
            DB::table('entitlement_plans')
                ->where('slug', 'free')
                ->update([
                    'price_monthly' => 0,
                    'price_yearly' => 0,
                    'currency' => 'USD',
                ]);
        }
    }

    public function down(): void
    {
        Schema::table('entitlement_plans', function (Blueprint $table) {
            $table->dropColumn(['price_monthly', 'price_yearly', 'currency']);
        });
    }
};
