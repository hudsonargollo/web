<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lab_projects', function (Blueprint $table) {
            $table->timestamp('opened_at')->nullable()->after('frozen_at');
        });

        DB::table('lab_projects')
            ->whereNull('opened_at')
            ->update(['opened_at' => DB::raw('updated_at')]);
    }

    public function down(): void
    {
        Schema::table('lab_projects', function (Blueprint $table) {
            $table->dropColumn('opened_at');
        });
    }
};
