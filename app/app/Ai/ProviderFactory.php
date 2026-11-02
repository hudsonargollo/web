<?php

namespace App\Ai;

use App\Ai\Contracts\ChatDriver;
use App\Ai\Exceptions\AiException;
use App\Ai\Exceptions\ProviderException;
use App\Ai\Settings\AiSettingsRepository;

final class ProviderFactory
{
    /**
     * @param  array<string, array<string, mixed>>  $providers
     * @param  array<string, class-string<ChatDriver>>  $drivers
     */
    public function __construct(
        private readonly array $providers,
        private readonly array $drivers,
        private readonly AiSettingsRepository $settings,
    ) {}

    public function make(string $provider): ChatDriver
    {
        $config = $this->providers[$provider] ?? null;
        if (! is_array($config)) {
            throw new AiException("Unknown AI provider [{$provider}]. Add it under config/ai.php → providers.");
        }

        $driverKey = (string) ($config['driver'] ?? '');
        $class = $this->drivers[$driverKey] ?? null;
        if (! is_string($class) || ! is_a($class, ChatDriver::class, true)) {
            throw new AiException("Unknown AI driver [{$driverKey}] for provider [{$provider}].");
        }

        $config['api_key'] = $this->settings->apiKey($provider);

        if (trim((string) $config['api_key']) === '') {
            throw ProviderException::missingKey($provider);
        }

        return new $class($provider, $config);
    }
}
