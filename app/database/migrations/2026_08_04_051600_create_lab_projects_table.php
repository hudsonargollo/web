<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lab_projects', function (Blueprint $table) {
            $table->id();
            $table->char('uuid', 36)->unique();
            $table->string('title')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('lab_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lab_project_id')->constrained('lab_projects')->cascadeOnDelete();
            $table->string('role', 16);
            $table->text('content');
            $table->timestamps();

            $table->index(['lab_project_id', 'id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lab_messages');
        Schema::dropIfExists('lab_projects');
    }
};
