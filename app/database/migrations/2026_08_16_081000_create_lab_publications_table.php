<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lab_publications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lab_project_id')->unique()->constrained('lab_projects')->cascadeOnDelete();
            $table->string('public_id', 26)->unique();
            $table->string('kind', 16)->default('subdomain');
            $table->string('subdomain', 48)->nullable();
            $table->string('custom_host', 253)->nullable();
            $table->string('status', 16)->default('idle');
            $table->string('verify_token', 64);
            $table->timestamp('custom_host_verified_at')->nullable();
            $table->timestamp('published_at')->nullable();
            $table->text('last_error')->nullable();
            $table->timestamps();

            $table->unique('subdomain');
            $table->unique('custom_host');
            $table->index(['status', 'subdomain']);
            $table->index(['status', 'custom_host']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lab_publications');
    }
};
