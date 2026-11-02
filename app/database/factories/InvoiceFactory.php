<?php

namespace Database\Factories;

use App\Finance\InvoiceStatus;
use App\Models\Invoice;
use App\Models\User;
use App\Payments\PaymentCatalog;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Invoice>
 */
class InvoiceFactory extends Factory
{
    protected $model = Invoice::class;

    public function definition(): array
    {
        return [
            'public_id' => (string) Str::ulid(),
            'user_id' => User::factory(),
            'driver' => PaymentCatalog::STRIPE,
            'provider_invoice_id' => 'in_'.Str::lower((string) Str::ulid()),
            'amount' => 29,
            'currency' => 'USD',
            'status' => InvoiceStatus::Paid,
            'paid_at' => now(),
        ];
    }

    public function open(): static
    {
        return $this->state(fn (): array => [
            'status' => InvoiceStatus::Open,
            'paid_at' => null,
        ]);
    }

    public function failed(): static
    {
        return $this->state(fn (): array => [
            'status' => InvoiceStatus::Failed,
            'paid_at' => null,
        ]);
    }
}
