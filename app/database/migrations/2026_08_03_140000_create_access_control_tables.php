<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('access_roles', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->string('title');
            $table->string('summary')->nullable();
            $table->boolean('locked')->default(false);
            $table->timestamps();
        });

        Schema::create('access_abilities', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->string('cluster');
            $table->string('title');
            $table->timestamps();
        });

        Schema::create('access_role_ability', function (Blueprint $table) {
            $table->foreignId('access_role_id')->constrained('access_roles')->cascadeOnDelete();
            $table->foreignId('access_ability_id')->constrained('access_abilities')->cascadeOnDelete();
            $table->primary(['access_role_id', 'access_ability_id']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('access_role_id')
                ->nullable()
                ->after('id')
                ->constrained('access_roles')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('access_role_id');
        });

        Schema::dropIfExists('access_role_ability');
        Schema::dropIfExists('access_abilities');
        Schema::dropIfExists('access_roles');
    }
};
