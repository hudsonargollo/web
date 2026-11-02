<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('username')->nullable()->unique()->after('name');
            $table->string('phone', 32)->nullable()->after('email');
            $table->string('country', 2)->nullable()->after('phone');
            $table->string('status', 16)->default('active')->after('country');
            $table->string('avatar_path')->nullable()->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['username', 'phone', 'country', 'status', 'avatar_path']);
        });
    }
};
