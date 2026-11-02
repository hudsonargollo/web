<?php

namespace App\Ai\Lab;

/**
 * Formats AUTO_REPAIR turn metadata into the hidden LLM user payload.
 */
final class AutoRepairPrompt
{
    /**
     * @param  array<string, mixed>  $meta
     */
    public static function format(array $meta): string
    {
        $normalized = self::normalize($meta);
        $errorType = (string) $normalized['errorType'];

        $phaseNote = $errorType === 'BUILD_ERROR'
            ? 'The in-browser bundler failed while compiling the VFS snapshot (syntax/import/build error).'
            : 'The project compiled successfully. This error occurred later at RUNTIME during React render/execution inside the preview — it is NOT a bundler/compile failure.';

        /** @var list<array<string, mixed>> $errors */
        $errors = $normalized['errors'];
        /** @var list<string> $targets */
        $targets = $normalized['targets'];
        $targetLabel = $targets !== [] ? implode(', ', $targets) : ((string) ($normalized['file'] ?? 'src/App.jsx'));

        $lines = [
            '[SYSTEM AUTO-REPAIR REQUEST]',
            'Type: '.$errorType,
            $phaseNote,
            'Target File(s): '.$targetLabel,
            '',
            '[ACTIVE RUNTIME ERRORS]',
        ];

        foreach ($errors as $index => $row) {
            $message = trim((string) ($row['message'] ?? 'Unknown error')) ?: 'Unknown error';
            $file = trim((string) ($row['file'] ?? ''));
            $line = $row['line'] ?? null;
            $component = trim((string) ($row['component'] ?? ''));
            $loc = $file !== ''
                ? ($line !== null && $line !== '' ? $file.':'.$line : $file)
                : 'unknown';
            $suffix = $component !== '' ? ' ('.$component.')' : '';
            $lines[] = '- Error '.($index + 1).': '.$message.' at '.$loc.$suffix;
        }

        $stack = trim((string) ($normalized['stack'] ?? ''));
        if ($stack !== '') {
            $lines[] = '';
            $lines[] = '[PRIMARY STACK]';
            $lines[] = $stack;
        }

        $lines[] = '';
        $lines[] = '[CONSTRAINTS]';
        $lines[] = '- Surgical intent: change the minimum needed for the listed errors, but always via atomic write_file (full file body).';
        $lines[] = '- There is no apply_patch tool — emit write_file with the complete updated file.';
        $lines[] = '- Do NOT delete unrelated imports, routes, or pages (e.g. HomePage, SignupPage) unless required to fix a listed error.';
        $lines[] = '- Only edit Target File(s) unless another file is strictly required by a listed error.';
        $lines[] = '- Fix the broken file(s) in VFS immediately using write_file.';

        return implode("\n", $lines);
    }

    /**
     * Short content stored in chat history (never the raw SYSTEM dump).
     *
     * @param  array<string, mixed>  $meta
     */
    public static function displayContent(array $meta): string
    {
        $normalized = self::normalize($meta);
        $component = trim((string) ($normalized['component'] ?? ''));
        $file = trim((string) ($normalized['file'] ?? ''));
        $target = $file !== '' ? $file : ($component !== '' ? $component : 'preview');

        return 'Automated Error Repair · '.$target;
    }

    /**
     * Normalize client metadata for persistence / bootstrap.
     *
     * @param  array<string, mixed>  $meta
     * @return array{
     *     type: string,
     *     errorType: string,
     *     message: string,
     *     stack: string,
     *     file: ?string,
     *     component: ?string,
     *     line: int|string|null,
     *     errors: list<array<string, mixed>>,
     *     targets: list<string>,
     *     subtitle: ?string
     * }
     */
    public static function normalize(array $meta): array
    {
        $errorType = strtoupper((string) ($meta['error_type'] ?? $meta['errorType'] ?? 'RUNTIME_ERROR'));
        if (in_array($errorType, ['AUTO_REPAIR', 'RUNTIME_CONSOLE_ERROR'], true)) {
            $errorType = 'RUNTIME_ERROR';
        }
        if (! in_array($errorType, ['BUILD_ERROR', 'RUNTIME_ERROR'], true)) {
            $errorType = 'RUNTIME_ERROR';
        }

        $errors = [];
        if (isset($meta['errors']) && is_array($meta['errors'])) {
            foreach ($meta['errors'] as $row) {
                if (! is_array($row)) {
                    continue;
                }
                $message = trim((string) ($row['message'] ?? ''));
                if ($message === '') {
                    continue;
                }
                $file = trim((string) ($row['file'] ?? '')) ?: null;
                $component = trim((string) ($row['component'] ?? '')) ?: null;
                $line = $row['line'] ?? null;
                if (is_numeric($line)) {
                    $line = (int) $line;
                } else {
                    $line = null;
                }
                $errors[] = [
                    'message' => $message,
                    'stack' => trim((string) ($row['stack'] ?? '')),
                    'file' => $file,
                    'line' => $line,
                    'component' => $component,
                ];
            }
        }

        $file = trim((string) ($meta['file'] ?? '')) ?: null;
        $component = trim((string) ($meta['component'] ?? '')) ?: null;
        $message = trim((string) ($meta['message'] ?? 'Unknown error')) ?: 'Unknown error';
        $stack = trim((string) ($meta['stack'] ?? ''));
        $line = $meta['line'] ?? null;
        if (is_numeric($line)) {
            $line = (int) $line;
        } else {
            $line = null;
        }

        if ($errors === []) {
            $errors[] = [
                'message' => $message,
                'stack' => $stack,
                'file' => $file,
                'line' => $line,
                'component' => $component,
            ];
        }

        if ($file === null) {
            $file = $errors[0]['file'] ?? null;
        }
        if ($component === null) {
            $component = $errors[0]['component'] ?? null;
        }

        $targets = [];
        if (isset($meta['targets']) && is_array($meta['targets'])) {
            foreach ($meta['targets'] as $target) {
                $path = trim((string) $target);
                if ($path !== '' && ! in_array($path, $targets, true)) {
                    $targets[] = $path;
                }
            }
        }
        foreach ($errors as $row) {
            $path = trim((string) ($row['file'] ?? ''));
            if ($path !== '' && ! in_array($path, $targets, true)) {
                $targets[] = $path;
            }
        }
        if ($file !== null && ! in_array($file, $targets, true)) {
            array_unshift($targets, $file);
        }
        if ($targets === [] && $file === null) {
            $file = 'src/App.jsx';
            $targets[] = $file;
            $errors[0]['file'] = $file;
        }

        $subtitle = trim((string) ($meta['subtitle'] ?? ''));
        if ($subtitle === '') {
            $subtitle = $errorType === 'BUILD_ERROR'
                ? 'Fixing build failure…'
                : (count($errors) > 1
                    ? 'Fixing '.count($errors).' runtime errors…'
                    : 'Fixing runtime rendering crash…');
        }

        return [
            'type' => 'AUTO_REPAIR',
            'errorType' => $errorType,
            'message' => $message,
            'stack' => $stack,
            'file' => $file,
            'component' => $component,
            'line' => $line,
            'errors' => $errors,
            'targets' => $targets,
            'subtitle' => $subtitle,
        ];
    }
}
