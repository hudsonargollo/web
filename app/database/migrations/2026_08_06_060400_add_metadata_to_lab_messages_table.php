<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lab_messages', function (Blueprint $table) {
            if (! Schema::hasColumn('lab_messages', 'metadata')) {
                $table->json('metadata')->nullable()->after('content');
            }
        });
    }

    public function down(): void
    {
        Schema::table('lab_messages', function (Blueprint $table) {
            if (Schema::hasColumn('lab_messages', 'metadata')) {
                $table->dropColumn('metadata');
            }
        });
    }
};
