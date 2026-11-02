<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lab_projects', function (Blueprint $table) {
            $table->unsignedTinyInteger('kit_version')->nullable()->after('notes');
            $table->string('stack', 64)->nullable()->after('kit_version');
            $table->string('workspace_status', 16)->default('pending')->after('stack');
        });
    }

    public function down(): void
    {
        Schema::table('lab_projects', function (Blueprint $table) {
            $table->dropColumn(['kit_version', 'stack', 'workspace_status']);
        });
    }
};
