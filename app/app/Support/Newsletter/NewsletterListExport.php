<?php

namespace App\Support\Newsletter;

use App\Models\NewsletterSubscriber;
use Illuminate\Support\Collection;
use Symfony\Component\HttpFoundation\StreamedResponse;

final class NewsletterListExport
{
    /**
     * @param  Collection<int, NewsletterSubscriber>  $rows
     */
    public function download(Collection $rows, string $format): StreamedResponse
    {
        $stamp = now()->format('Y-m-d-His');

        return match ($format) {
            'csv' => $this->streamDelimited($rows, ',', "newsletter-{$stamp}.csv", 'text/csv; charset=UTF-8'),
            'tsv' => $this->streamDelimited($rows, "\t", "newsletter-{$stamp}.tsv", 'text/tab-separated-values; charset=UTF-8'),
            'json' => $this->streamJson($rows, "newsletter-{$stamp}.json"),
            default => abort(404),
        };
    }

    /**
     * @param  Collection<int, NewsletterSubscriber>  $rows
     */
    private function streamDelimited(Collection $rows, string $delimiter, string $filename, string $contentType): StreamedResponse
    {
        $headers = $this->headers();

        return response()->streamDownload(function () use ($rows, $delimiter, $headers): void {
            $out = fopen('php://output', 'w');

            if ($out === false) {
                return;
            }

            fwrite($out, "\xEF\xBB\xBF");
            fputcsv($out, $headers, $delimiter);

            foreach ($rows as $row) {
                fputcsv($out, $this->line($row), $delimiter);
            }

            fclose($out);
        }, $filename, [
            'Content-Type' => $contentType,
        ]);
    }

    /**
     * @param  Collection<int, NewsletterSubscriber>  $rows
     */
    private function streamJson(Collection $rows, string $filename): StreamedResponse
    {
        return response()->streamDownload(function () use ($rows): void {
            $payload = $rows->map(fn (NewsletterSubscriber $row): array => [
                'email' => (string) $row->email,
                'joined_at' => $this->stamp($row->created_at),
                'confirmed_at' => $this->stamp($row->confirmed_at),
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
            __('dashboard.Email'),
            __('dashboard.Joined'),
            __('dashboard.Confirmed'),
        ];
    }

    /**
     * @return list<string>
     */
    private function line(NewsletterSubscriber $row): array
    {
        return [
            (string) $row->email,
            $this->stamp($row->created_at),
            $this->stamp($row->confirmed_at),
        ];
    }

    private function stamp(mixed $value): string
    {
        if (! $value instanceof \DateTimeInterface) {
            return '';
        }

        return $value->timezone(config('app.timezone'))->format('Y-m-d H:i:s');
    }
}
