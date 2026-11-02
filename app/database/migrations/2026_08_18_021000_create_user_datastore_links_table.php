<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_datastore_links', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('driver', 32);
            $table->string('external_id', 64)->nullable();
            $table->string('login')->nullable();
            $table->text('access_token')->nullable();
            $table->text('refresh_token')->nullable();
            $table->timestamp('token_expires_at')->nullable();
            $table->string('host_url')->nullable();
            $table->text('publishable_token')->nullable();
            $table->text('steward_token')->nullable();
            $table->string('project_ref', 64)->nullable();
            $table->string('project_name')->nullable();
            $table->string('organization_id', 64)->nullable();
            $table->json('settings')->nullable();
            $table->timestamp('linked_at')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'driver']);
            $table->index(['driver', 'project_ref']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_datastore_links');
    }
};
