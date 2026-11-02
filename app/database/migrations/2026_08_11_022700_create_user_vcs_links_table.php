<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_vcs_links', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('driver', 32);
            $table->string('external_id', 64);
            $table->string('login');
            $table->string('avatar_url')->nullable();
            $table->text('access_token');
            $table->string('scopes')->nullable();
            $table->timestamp('linked_at')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'driver']);
            $table->index(['driver', 'external_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_vcs_links');
    }
};
