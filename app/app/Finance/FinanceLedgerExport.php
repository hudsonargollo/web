<?php

namespace App\Finance;

use App\Models\Invoice;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Schema;
use Symfony\Component\HttpFoundation\StreamedResponse;

final class FinanceLedgerExport
{
    /**
     * @param  Collection<int, Invoice>|null  $invoices
     */
    public function download(?Collection $invoices, string $format): StreamedResponse
    {
        $invoices ??= $this->invoices();
        $stamp = now()->format('Y-m-d-His');

        return match ($format) {
            'csv' => $this->streamDelimited($invoices, ',', "finance-{$stamp}.csv", 'text/csv; charset=UTF-8'),
            'tsv' => $this->streamDelimited($invoices, "\t", "finance-{$stamp}.tsv", 'text/tab-separated-values; charset=UTF-8'),
            'json' => $this->streamJson($invoices, "finance-{$stamp}.json"),
            default => abort(404),
        };
    }

    /**
     * @return Collection<int, Invoice>
     */
    public function invoices(): Collection
    {
        if (! Schema::hasTable('invoices')) {
            return collect();
        }

        return Invoice::query()
            ->with(['user', 'plan'])
            ->orderByDesc('id')
            ->get();
    }

    /**
     * @param  Collection<int, Invoice>  $invoices
     */
    private function streamDelimited(Collection $invoices, string $delimiter, string $filename, string $contentType): StreamedResponse
    {
        $headers = $this->headers();

        return response()->streamDownload(function () use ($invoices, $delimiter, $headers): void {
            $out = fopen('php://output', 'w');

            if ($out === false) {
                return;
            }

            fwrite($out, "\xEF\xBB\xBF");
            fputcsv($out, $headers, $delimiter);

            foreach ($invoices as $invoice) {
                fputcsv($out, $this->row($invoice), $delimiter);
            }

            fclose($out);
        }, $filename, [
            'Content-Type' => $contentType,
        ]);
    }

    /**
     * @param  Collection<int, Invoice>  $invoices
     */
    private function streamJson(Collection $invoices, string $filename): StreamedResponse
    {
        return response()->streamDownload(function () use ($invoices): void {
            $payload = $invoices->map(fn (Invoice $invoice): array => [
                'user' => (string) ($invoice->user?->name ?: ''),
                'email' => (string) ($invoice->user?->email ?: ''),
                'pack' => (string) ($invoice->plan?->title ?: ''),
                'amount' => (float) $invoice->amount,
                'currency' => (string) $invoice->currency,
                'method' => FinanceCopy::driver((string) $invoice->driver),
                'status' => FinanceCopy::invoice($invoice->status)['label'],
                'provider_invoice' => (string) ($invoice->provider_invoice_id ?: ''),
                'paid_at' => $invoice->paid_at?->toIso8601String() ?: '',
                'refunded_at' => $invoice->refunded_at?->toIso8601String() ?: '',
                'description' => (string) ($invoice->description ?: ''),
            ])->values()->all();

            echo json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
        }, $filename, [
            'Content-Type' => 'application/json; charset=UTF-8',
        ]);
    }

    /**
     * @return list<string>
     */
    private function headers(): array
    {
        return [
            'User',
            'Email',
            'Pack',
            'Amount',
            'Currency',
            'Method',
            'Status',
            'Provider invoice',
            'Paid at',
            'Refunded at',
            'Description',
        ];
    }

    /**
     * @return list<string>
     */
    private function row(Invoice $invoice): array
    {
        return [
            (string) ($invoice->user?->name ?: ''),
            (string) ($invoice->user?->email ?: ''),
            (string) ($invoice->plan?->title ?: ''),
            (string) $invoice->amount,
            (string) $invoice->currency,
            FinanceCopy::driver((string) $invoice->driver),
            FinanceCopy::invoice($invoice->status)['label'],
            (string) ($invoice->provider_invoice_id ?: ''),
            $invoice->paid_at?->toIso8601String() ?: '',
            $invoice->refunded_at?->toIso8601String() ?: '',
            (string) ($invoice->description ?: ''),
        ];
    }
}
