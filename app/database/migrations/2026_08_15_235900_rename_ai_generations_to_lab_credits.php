<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('plan_grants')) {
            DB::table('plan_grants')
                ->where('code', 'ai_generations')
                ->update(['code' => 'lab_credits']);
        }

        if (Schema::hasTable('usage_ledgers')) {
            DB::table('usage_ledgers')
                ->where('code', 'ai_generations')
                ->update(['code' => 'lab_credits']);
        }

        if (! Schema::hasTable('entitlement_plans') || ! Schema::hasTable('plan_grants')) {
            return;
        }

        $ceilings = [
            'free' => 100,
            'pro' => 2500,
            'agency' => null,
        ];

        foreach ($ceilings as $slug => $ceiling) {
            $planId = DB::table('entitlement_plans')->where('slug', $slug)->value('id');
            if ($planId === null) {
                continue;
            }

            DB::table('plan_grants')
                ->where('entitlement_plan_id', $planId)
                ->where('code', 'lab_credits')
                ->update(['ceiling' => $ceiling]);
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('plan_grants')) {
            DB::table('plan_grants')
                ->where('code', 'lab_credits')
                ->update(['code' => 'ai_generations']);
        }

        if (Schema::hasTable('usage_ledgers')) {
            DB::table('usage_ledgers')
                ->where('code', 'lab_credits')
                ->update(['code' => 'ai_generations']);
        }
    }
};
