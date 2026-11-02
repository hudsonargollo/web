<?php

namespace App\Ai\Support;

/**
 * Incremental parser for Provider SSE (OpenAI / Anthropic / Gemini alt=sse).
 */
final class SseBuffer
{
    private string $buffer = '';

    /**
     * @return list<array{event: string, data: string}>
     */
    public function push(string $chunk): array
    {
        if ($chunk === '') {
            return [];
        }

        $this->buffer .= $chunk;

        return $this->drain(flushRemainder: false);
    }

    /**
     * @return list<array{event: string, data: string}>
     */
    public function flush(): array
    {
        return $this->drain(flushRemainder: true);
    }

    /**
     * @return list<array{event: string, data: string}>
     */
    private function drain(bool $flushRemainder): array
    {
        $events = [];

        while (true) {
            $lf = strpos($this->buffer, "\n\n");
            $crlf = strpos($this->buffer, "\r\n\r\n");
            if ($lf === false && $crlf === false) {
                break;
            }

            if ($lf === false) {
                $pos = $crlf;
                $sep = 4;
            } elseif ($crlf === false) {
                $pos = $lf;
                $sep = 2;
            } else {
                $pos = min($lf, $crlf);
                $sep = $pos === $crlf ? 4 : 2;
            }

            $raw = substr($this->buffer, 0, $pos);
            $this->buffer = substr($this->buffer, $pos + $sep);
            $parsed = $this->parseBlock($raw);
            if ($parsed !== null) {
                $events[] = $parsed;
            }
        }

        if ($flushRemainder && trim($this->buffer) !== '') {
            $parsed = $this->parseBlock($this->buffer);
            $this->buffer = '';
            if ($parsed !== null) {
                $events[] = $parsed;
            }
        }

        return $events;
    }

    /**
     * @return array{event: string, data: string}|null
     */
    private function parseBlock(string $raw): ?array
    {
        $event = 'message';
        $dataLines = [];

        foreach (preg_split("/\r\n|\n|\r/", $raw) ?: [] as $line) {
            if ($line === '' || str_starts_with($line, ':')) {
                continue;
            }
            if (str_starts_with($line, 'event:')) {
                $event = trim(substr($line, 6));

                continue;
            }
            if (str_starts_with($line, 'data:')) {
                $dataLines[] = substr($line, 5) === '' ? '' : ltrim(substr($line, 5));
            }
        }

        if ($dataLines === []) {
            return null;
        }

        return [
            'event' => $event !== '' ? $event : 'message',
            'data' => implode("\n", $dataLines),
        ];
    }
}
