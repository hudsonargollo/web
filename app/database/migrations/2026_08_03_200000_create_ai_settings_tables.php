<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_workspace_settings', function (Blueprint $table) {
            $table->id();
            $table->string('default_model')->nullable();
            $table->timestamps();
        });

        Schema::create('ai_provider_credentials', function (Blueprint $table) {
            $table->id();
            $table->string('provider')->unique();
            $table->text('api_key')->nullable();
            $table->boolean('enabled')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_provider_credentials');
        Schema::dropIfExists('ai_workspace_settings');
    }
};
