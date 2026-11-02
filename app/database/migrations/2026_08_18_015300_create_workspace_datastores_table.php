<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('workspace_datastores', function (Blueprint $table) {
            $table->id();
            $table->string('kind', 32)->unique();
            $table->string('host_url')->nullable();
            $table->text('publishable_token')->nullable();
            $table->text('steward_token')->nullable();
            $table->text('console_token')->nullable();
            $table->boolean('enabled')->default(true);
            $table->json('settings')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('workspace_datastores');
    }
};
