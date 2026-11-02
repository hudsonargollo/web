<?php

namespace App\Support\Users;

use App\Models\User;
use App\Support\Geography\Countries;
use Illuminate\Support\Collection;
use Symfony\Component\HttpFoundation\StreamedResponse;

final class UserDirectoryExport
{
    /**
     * @param  Collection<int, User>  $users
     */
    public function download(Collection $users, string $format): StreamedResponse
    {
        $stamp = now()->format('Y-m-d-His');

        return match ($format) {
            'csv' => $this->streamDelimited($users, ',', "users-{$stamp}.csv", 'text/csv; charset=UTF-8'),
            'tsv' => $this->streamDelimited($users, "\t", "users-{$stamp}.tsv", 'text/tab-separated-values; charset=UTF-8'),
            'json' => $this->streamJson($users, "users-{$stamp}.json"),
            default => abort(404),
        };
    }

    /**
     * @param  Collection<int, User>  $users
     */
    private function streamDelimited(Collection $users, string $delimiter, string $filename, string $contentType): StreamedResponse
    {
        $headers = $this->headers();

        return response()->streamDownload(function () use ($users, $delimiter, $headers): void {
            $out = fopen('php://output', 'w');

            if ($out === false) {
                return;
            }

            // UTF-8 BOM so Excel opens CSV correctly.
            fwrite($out, "\xEF\xBB\xBF");
            fputcsv($out, $headers, $delimiter);

            foreach ($users as $user) {
                fputcsv($out, $this->row($user), $delimiter);
            }

            fclose($out);
        }, $filename, [
            'Content-Type' => $contentType,
        ]);
    }

    /**
     * @param  Collection<int, User>  $users
     */
    private function streamJson(Collection $users, string $filename): StreamedResponse
    {
        return response()->streamDownload(function () use ($users): void {
            $payload = $users->map(fn (User $user): array => [
                'name' => (string) $user->name,
                'username' => (string) ($user->username ?: ''),
                'email' => (string) $user->email,
                'phone' => (string) ($user->phone ?: ''),
                'role' => (string) ($user->accessRole?->title ?? ''),
                'status' => $user->statusEnum()->label(),
                'country' => Countries::label($user->country) ?: (string) ($user->country ?: ''),
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
            'Name',
            'Username',
            'Email',
            'Phone',
            'Role',
            'Status',
            'Country',
        ];
    }

    /**
     * @return list<string>
     */
    private function row(User $user): array
    {
        return [
            (string) $user->name,
            (string) ($user->username ?: ''),
            (string) $user->email,
            (string) ($user->phone ?: ''),
            (string) ($user->accessRole?->title ?? ''),
            $user->statusEnum()->label(),
            Countries::label($user->country) ?: (string) ($user->country ?: ''),
        ];
    }
}
