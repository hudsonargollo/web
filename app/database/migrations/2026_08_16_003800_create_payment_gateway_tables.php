<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_gateways', function (Blueprint $table) {
            $table->id();
            $table->string('driver')->unique();
            $table->boolean('enabled')->default(false);
            $table->string('mode')->default('test');
            $table->text('public_key')->nullable();
            $table->text('secret_key')->nullable();
            $table->text('webhook_secret')->nullable();
            $table->json('settings')->nullable();
            $table->timestamps();
        });

        Schema::create('payment_webhook_events', function (Blueprint $table) {
            $table->id();
            $table->ulid('public_id')->unique();
            $table->string('driver');
            $table->string('event_type');
            $table->string('provider_event_id')->nullable();
            $table->json('payload')->nullable();
            $table->timestamps();

            $table->unique(['driver', 'provider_event_id']);
            $table->index(['driver', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_webhook_events');
        Schema::dropIfExists('payment_gateways');
    }
};
