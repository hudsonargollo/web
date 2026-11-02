<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lab_project_remotes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lab_project_id')->constrained('lab_projects')->cascadeOnDelete();
            $table->string('driver', 24)->default('github');
            $table->string('owner', 100);
            $table->string('repo', 100);
            $table->string('branch', 200)->default('main');
            $table->string('root_directory', 240)->nullable();
            $table->string('html_url', 500)->nullable();
            $table->string('forked_from', 220)->nullable();
            $table->string('last_pushed_sha', 64)->nullable();
            $table->string('last_pulled_sha', 64)->nullable();
            $table->timestamp('last_synced_at')->nullable();
            $table->timestamps();

            $table->unique(['lab_project_id', 'driver']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lab_project_remotes');
    }
};
