<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('entitlement_plans', function (Blueprint $table) {
            $table->id();
            $table->ulid('public_id')->unique();
            $table->string('slug')->unique();
            $table->string('title');
            $table->string('summary')->nullable();
            $table->unsignedSmallInteger('rank')->default(0);
            $table->boolean('is_default')->default(false);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('plan_grants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('entitlement_plan_id')->constrained('entitlement_plans')->cascadeOnDelete();
            $table->string('code');
            $table->string('kind');
            $table->boolean('allowed')->default(true);
            $table->unsignedInteger('ceiling')->nullable();
            $table->string('window')->default('none');
            $table->timestamps();

            $table->unique(['entitlement_plan_id', 'code']);
        });

        Schema::create('user_entitlements', function (Blueprint $table) {
            $table->id();
            $table->ulid('public_id')->unique();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->foreignId('entitlement_plan_id')->constrained('entitlement_plans')->restrictOnDelete();
            $table->string('status')->default('active');
            $table->timestamp('started_at')->nullable();
            $table->timestamp('ends_at')->nullable();
            $table->timestamps();
        });

        Schema::create('usage_ledgers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('code');
            $table->string('window_key');
            $table->unsignedInteger('consumed')->default(0);
            $table->timestamps();

            $table->unique(['user_id', 'code', 'window_key']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('usage_ledgers');
        Schema::dropIfExists('user_entitlements');
        Schema::dropIfExists('plan_grants');
        Schema::dropIfExists('entitlement_plans');
    }
};
