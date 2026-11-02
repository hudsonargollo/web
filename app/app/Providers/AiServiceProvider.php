<?php

namespace App\Providers;

use App\Ai\ChatGateway;
use App\Ai\Cost\CostEstimator;
use App\Ai\ModelCatalog;
use App\Ai\PromptStore;
use App\Ai\ProviderFactory;
use App\Ai\Settings\AiSettingsRepository;
use Illuminate\Support\ServiceProvider;

class AiServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(AiSettingsRepository::class);

        $this->app->singleton(PromptStore::class, function () {
            /** @var array<string, string|list<string>> $prompts */
            $prompts = config('ai.prompts', []);

            return new PromptStore($prompts);
        });

        $this->app->singleton(ModelCatalog::class, function ($app) {
            return new ModelCatalog(
                models: config('ai.models', []),
                settings: $app->make(AiSettingsRepository::class),
            );
        });

        $this->app->singleton(ProviderFactory::class, function ($app) {
            /** @var array<string, class-string> $drivers */
            $drivers = config('ai.drivers', []);

            return new ProviderFactory(
                providers: config('ai.providers', []),
                drivers: $drivers,
                settings: $app->make(AiSettingsRepository::class),
            );
        });

        $this->app->singleton(ChatGateway::class);
        $this->app->singleton(CostEstimator::class);
    }
}
