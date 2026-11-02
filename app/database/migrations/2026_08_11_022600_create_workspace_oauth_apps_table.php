<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('workspace_oauth_apps', function (Blueprint $table) {
            $table->id();
            $table->string('driver', 32)->unique();
            $table->string('client_id')->nullable();
            $table->text('client_secret')->nullable();
            $table->boolean('enabled')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('workspace_oauth_apps');
    }
};
