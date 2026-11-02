<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('languages', function (Blueprint $table) {
            $table->id();
            $table->ulid('public_id')->unique();
            $table->string('code', 16)->unique();
            $table->string('name');
            $table->string('native_name')->nullable();
            $table->string('direction', 3)->default('ltr');
            $table->boolean('enabled')->default(true);
            $table->boolean('is_default')->default(false);
            $table->timestamps();
        });

        Schema::create('language_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('language_id')->constrained('languages')->cascadeOnDelete();
            $table->string('group', 64);
            $table->string('key', 512);
            $table->text('value')->nullable();
            $table->timestamps();

            $table->unique(['language_id', 'group', 'key']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('language_lines');
        Schema::dropIfExists('languages');
    }
};
