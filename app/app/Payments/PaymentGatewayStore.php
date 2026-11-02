<?php

namespace App\Payments;

use App\Finance\WebhookApplicator;
use App\Finance\WebhookApplyStatus;
use App\Models\PaymentGateway;
use App\Models\PaymentWebhookEvent;
use Illuminate\Support\Facades\Schema;

final class PaymentGatewayStore
{
    private bool $tableReady;

    public function __construct()
    {
        $this->tableReady = Schema::hasTable('payment_gateways');
    }

    /**
     * @return array{
     *     driver: string,
     *     title: string,
     *     summary: string,
     *     enabled: bool,
     *     mode: string,
     *     public_key: string,
     *     secret_key: string,
     *     webhook_secret: string,
     *     source: 'workspace'|'env'|'missing',
     *     ready: bool,
     *     has_public: bool,
     *     has_secret: bool,
     *     has_webhook: bool,
     *     unreadable: bool,
     *     settings: array<string, mixed>,
     *     manage: list<array{label: string, url: string}>,
     *     webhook_url: string
     * }
     */
    public function get(string $driver): array
    {
        $definition = PaymentCatalog::definition($driver);
        if ($definition === null) {
            throw new \InvalidArgumentException('Unknown payment method.');
        }

        $env = $this->envBundle($driver);
        $row = $this->tableReady
            ? PaymentGateway::query()->where('driver', $driver)->first()
            : null;

        $public = filled($row?->public_key) ? (string) $row->public_key : $env['public_key'];
        $secret = filled($row?->secret_key) ? (string) $row->secret_key : $env['secret_key'];
        $webhook = filled($row?->webhook_secret) ? (string) $row->webhook_secret : $env['webhook_secret'];
        $mode = filled($row?->mode) ? (string) $row->mode : $env['mode'];
        $enabled = $row !== null ? (bool) $row->enabled : false;
        $settings = is_array($row?->settings) ? $row->settings : [];

        $workspaceFilled = $row !== null && (filled($row->public_key) || filled($row->secret_key));
        $envFilled = $env['secret_key'] !== '' || $env['public_key'] !== '';
        $source = $workspaceFilled ? 'workspace' : ($envFilled ? 'env' : 'missing');
        $ready = $enabled && $secret !== '' && ($driver === PaymentCatalog::PAYPAL ? $public !== '' : true);

        return [
            'driver' => $driver,
            'title' => $definition['title'],
            'summary' => $definition['summary'],
            'enabled' => $enabled,
            'mode' => in_array($mode, ['test', 'live'], true) ? $mode : 'test',
            'public_key' => $enabled ? $public : '',
            'secret_key' => $enabled ? $secret : '',
            'webhook_secret' => $enabled ? $webhook : '',
            'source' => $ready ? $source : ($enabled ? $source : 'missing'),
            'ready' => $ready,
            'has_public' => $row !== null && filled($row->public_key),
            'has_secret' => $row !== null && filled($row->secret_key),
            'has_webhook' => $row !== null && filled($row->webhook_secret),
            'unreadable' => $row !== null && (
                $row->cipherIsUnreadable('public_key')
                || $row->cipherIsUnreadable('secret_key')
                || $row->cipherIsUnreadable('webhook_secret')
            ),
            'settings' => $settings,
            'manage' => PaymentCatalog::manageLinks($driver, $mode),
            'webhook_url' => url('/webhooks/'.$driver),
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function all(): array
    {
        $rows = [];
        foreach (PaymentCatalog::drivers() as $driver) {
            $rows[] = $this->get($driver);
        }

        return $rows;
    }

    /**
     * @param  array{
     *     enabled?: bool,
     *     mode?: string,
     *     public_key?: string|null,
     *     secret_key?: string|null,
     *     webhook_secret?: string|null,
     *     clear_public?: bool,
     *     clear_secret?: bool,
     *     clear_webhook?: bool,
     *     settings?: array<string, mixed>
     * }  $data
     */
    public function save(string $driver, array $data): void
    {
        if (PaymentCatalog::definition($driver) === null) {
            throw new \InvalidArgumentException('Unknown payment method.');
        }

        $row = PaymentGateway::query()->firstOrNew(['driver' => $driver]);
        $row->enabled = (bool) ($data['enabled'] ?? $row->enabled ?? false);
        $row->mode = in_array($data['mode'] ?? $row->mode, ['test', 'live'], true)
            ? (string) ($data['mode'] ?? $row->mode ?? 'test')
            : 'test';

        if (! empty($data['clear_public'])) {
            $row->public_key = null;
        } elseif (array_key_exists('public_key', $data) && filled($data['public_key'])) {
            $row->public_key = trim((string) $data['public_key']);
        }

        if (! empty($data['clear_secret'])) {
            $row->secret_key = null;
        } elseif (array_key_exists('secret_key', $data) && filled($data['secret_key'])) {
            $row->secret_key = trim((string) $data['secret_key']);
        }

        if (! empty($data['clear_webhook'])) {
            $row->webhook_secret = null;
        } elseif (array_key_exists('webhook_secret', $data) && filled($data['webhook_secret'])) {
            $row->webhook_secret = trim((string) $data['webhook_secret']);
        }

        if (array_key_exists('settings', $data) && is_array($data['settings'])) {
            $current = is_array($row->settings) ? $row->settings : [];
            $row->settings = array_merge($current, $data['settings']);
        }

        $row->save();
    }

    /**
     * @param  array<string, mixed>  $probe
     */
    public function rememberProbe(string $driver, array $probe): void
    {
        $this->save($driver, [
            'settings' => [
                'last_probe' => [
                    'ok' => (bool) ($probe['ok'] ?? false),
                    'message' => (string) ($probe['message'] ?? ''),
                    'at' => now()->toIso8601String(),
                ],
            ],
        ]);
    }

    public function recordEvent(string $driver, string $type, ?string $providerEventId, array $payload): PaymentWebhookEvent
    {
        if (filled($providerEventId)) {
            $existing = PaymentWebhookEvent::query()
                ->where('driver', $driver)
                ->where('provider_event_id', $providerEventId)
                ->first();

            if ($existing !== null) {
                return $existing;
            }
        }

        $event = PaymentWebhookEvent::query()->create([
            'driver' => $driver,
            'event_type' => $type,
            'provider_event_id' => $providerEventId,
            'payload' => $payload,
            'status' => WebhookApplyStatus::Received,
            'attempts' => 0,
        ]);

        return app(WebhookApplicator::class)->apply($event);
    }

    /**
     * Keys for operator actions (refund, cancel). Ignores the enabled switch.
     *
     * @return array{public_key: string, secret_key: string, mode: string}
     */
    public function credentials(string $driver): array
    {
        $env = $this->envBundle($driver);
        $row = $this->tableReady
            ? PaymentGateway::query()->where('driver', $driver)->first()
            : null;

        $mode = filled($row?->mode) ? (string) $row->mode : $env['mode'];

        return [
            'public_key' => filled($row?->public_key) ? (string) $row->public_key : $env['public_key'],
            'secret_key' => filled($row?->secret_key) ? (string) $row->secret_key : $env['secret_key'],
            'mode' => in_array($mode, ['test', 'live'], true) ? $mode : 'test',
        ];
    }

    /**
     * @return list<PaymentWebhookEvent>
     */
    public function recentEvents(string $driver, int $limit = 8): array
    {
        if (! Schema::hasTable('payment_webhook_events')) {
            return [];
        }

        return PaymentWebhookEvent::query()
            ->where('driver', $driver)
            ->orderByDesc('id')
            ->limit($limit)
            ->get()
            ->all();
    }

    public function mask(string $value): ?string
    {
        if ($value === '') {
            return null;
        }

        $tail = substr($value, -4);

        return '••••••••'.$tail;
    }

    /**
     * @return array{public_key: string, secret_key: string, webhook_secret: string, mode: string}
     */
    private function envBundle(string $driver): array
    {
        $config = config('payments.'.$driver, []);

        return [
            'public_key' => trim((string) ($config['public_key'] ?? '')),
            'secret_key' => trim((string) ($config['secret_key'] ?? '')),
            'webhook_secret' => trim((string) ($config['webhook_secret'] ?? '')),
            'mode' => in_array($config['mode'] ?? 'test', ['test', 'live'], true)
                ? (string) $config['mode']
                : 'test',
        ];
    }
}
