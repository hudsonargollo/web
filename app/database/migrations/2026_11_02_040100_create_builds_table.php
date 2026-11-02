<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('builds', function (Blueprint $table) {
            $table->string('id', 32)->primary();
            $table->string('kind', 16);
            $table->string('title');
            $table->json('brief');
            $table->string('model', 64)->nullable();
            $table->string('status', 16)->default('queued')->index();
            $table->string('stage', 16)->nullable();
            $table->unsignedBigInteger('lab_project_id')->nullable()->index();
            $table->string('subdomain', 48)->nullable();
            $table->string('live_url', 255)->nullable();
            $table->char('idempotency_key', 64)->nullable()->unique();
            $table->unsignedInteger('turns')->default(0);
            $table->unsignedInteger('tool_turns')->default(0);
            $table->unsignedInteger('files')->default(0);
            $table->unsignedBigInteger('tokens_in')->default(0);
            $table->unsignedBigInteger('tokens_out')->default(0);
            $table->text('error')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('finished_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('builds');
    }
};
