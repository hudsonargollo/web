<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('user_entitlements', function (Blueprint $table) {
            $table->string('driver')->nullable()->after('status');
            $table->string('provider_subscription_id')->nullable()->after('driver');
            $table->string('interval')->nullable()->after('provider_subscription_id');
            $table->timestamp('last_paid_at')->nullable()->after('ends_at');
            $table->index(['status', 'interval']);
        });

        Schema::create('invoices', function (Blueprint $table) {
            $table->id();
            $table->ulid('public_id')->unique();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('entitlement_plan_id')->nullable()->constrained('entitlement_plans')->nullOnDelete();
            $table->foreignId('user_entitlement_id')->nullable()->constrained('user_entitlements')->nullOnDelete();
            $table->string('driver');
            $table->string('provider_invoice_id')->nullable();
            $table->string('provider_subscription_id')->nullable();
            $table->decimal('amount', 12, 2)->default(0);
            $table->string('currency', 3)->default('USD');
            $table->string('status')->default('open');
            $table->timestamp('paid_at')->nullable();
            $table->timestamp('refunded_at')->nullable();
            $table->foreignId('refunded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('description')->nullable();
            $table->timestamps();

            $table->unique(['driver', 'provider_invoice_id']);
            $table->index(['status', 'paid_at']);
        });

        Schema::create('credit_grants', function (Blueprint $table) {
            $table->id();
            $table->ulid('public_id')->unique();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->integer('amount');
            $table->string('kind');
            $table->string('reason')->nullable();
            $table->foreignId('granted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('entitlement_plan_id')->nullable()->constrained('entitlement_plans')->nullOnDelete();
            $table->foreignId('invoice_id')->nullable()->constrained('invoices')->nullOnDelete();
            $table->timestamps();

            $table->index(['user_id', 'created_at']);
        });

        Schema::table('payment_webhook_events', function (Blueprint $table) {
            $table->string('status')->default('received')->after('provider_event_id');
            $table->unsignedSmallInteger('attempts')->default(0)->after('status');
            $table->text('last_error')->nullable()->after('attempts');
            $table->foreignId('invoice_id')->nullable()->after('last_error')->constrained('invoices')->nullOnDelete();
            $table->foreignId('user_entitlement_id')->nullable()->after('invoice_id')->constrained('user_entitlements')->nullOnDelete();
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::table('payment_webhook_events', function (Blueprint $table) {
            $table->dropConstrainedForeignId('invoice_id');
            $table->dropConstrainedForeignId('user_entitlement_id');
            $table->dropColumn(['status', 'attempts', 'last_error']);
        });

        Schema::dropIfExists('credit_grants');
        Schema::dropIfExists('invoices');

        Schema::table('user_entitlements', function (Blueprint $table) {
            $table->dropIndex(['status', 'interval']);
            $table->dropColumn(['driver', 'provider_subscription_id', 'interval', 'last_paid_at']);
        });
    }
};
