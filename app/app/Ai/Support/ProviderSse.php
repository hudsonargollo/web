<?php

namespace App\Ai\Support;

use App\Ai\Exceptions\ProviderException;
use Illuminate\Http\Client\Response;
use Psr\Http\Message\StreamInterface;

/**
 * Read a streamed provider HTTP body as SSE frames — in real time.
 *
 * PHP's buffered stream layer blocks TLS reads until its internal chunk
 * (8 KB) fills, which turns token streaming into multi-second bursts.
 * We detach the underlying resource, switch it to non-blocking mode, and
 * poll with short sleeps so every provider frame reaches the UI the moment
 * it arrives on the wire.
 */
final class ProviderSse
{
    /** Poll interval while the socket has no data (microseconds). */
    private const IDLE_POLL_US = 15_000;

    /** Abort when the provider sends nothing at all for this long (seconds). */
    private const IDLE_TIMEOUT_S = 300;

    /**
     * @param  callable(array{event: string, data: string}): void  $onFrame
     */
    public static function consume(string $provider, Response $response, callable $onFrame): void
    {
        if ($response->failed()) {
            throw ProviderException::http($provider, $response->status(), $response->body());
        }

        $body = $response->toPsrResponse()->getBody();
        $buffer = new SseBuffer;

        $resource = self::detach($body);
        if ($resource !== null) {
            self::consumeNonBlocking($provider, $resource, $buffer, $onFrame);
        } else {
            self::consumeBlocking($body, $buffer, $onFrame);
        }

        foreach ($buffer->flush() as $frame) {
            $onFrame($frame);
        }
    }

    /**
     * @return resource|null
     */
    private static function detach(StreamInterface $body)
    {
        try {
            $resource = $body->detach();
        } catch (\Throwable) {
            return null;
        }

        return is_resource($resource) ? $resource : null;
    }

    /**
     * Real-time path: non-blocking reads deliver whatever bytes the TLS layer
     * has decrypted instead of waiting for PHP's 8 KB read buffer to fill.
     *
     * @param  resource  $resource
     * @param  callable(array{event: string, data: string}): void  $onFrame
     */
    private static function consumeNonBlocking(
        string $provider,
        $resource,
        SseBuffer $buffer,
        callable $onFrame,
    ): void {
        @stream_set_blocking($resource, false);
        $lastDataAt = microtime(true);

        try {
            while (! feof($resource)) {
                $chunk = @fread($resource, 65536);

                if ($chunk === false || $chunk === '') {
                    if (microtime(true) - $lastDataAt > self::IDLE_TIMEOUT_S) {
                        throw ProviderException::unreachable(
                            $provider,
                            'Stream went silent for '.self::IDLE_TIMEOUT_S.'s.',
                        );
                    }
                    usleep(self::IDLE_POLL_US);

                    continue;
                }

                $lastDataAt = microtime(true);
                foreach ($buffer->push($chunk) as $frame) {
                    $onFrame($frame);
                }
            }
        } finally {
            if (is_resource($resource)) {
                @fclose($resource);
            }
        }
    }

    /**
     * Fallback when the PSR stream cannot be detached (tests / fakes).
     *
     * @param  callable(array{event: string, data: string}): void  $onFrame
     */
    private static function consumeBlocking(StreamInterface $body, SseBuffer $buffer, callable $onFrame): void
    {
        while (! $body->eof()) {
            try {
                $chunk = $body->read(2048);
            } catch (\Throwable) {
                $chunk = '';
            }
            if (! is_string($chunk) || $chunk === '') {
                continue;
            }
            foreach ($buffer->push($chunk) as $frame) {
                $onFrame($frame);
            }
        }
    }
}
