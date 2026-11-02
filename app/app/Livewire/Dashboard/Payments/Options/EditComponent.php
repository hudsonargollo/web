<?php

namespace App\Livewire\Dashboard\Payments\Options;

use App\Payments\PaymentCatalog;
use App\Payments\PaymentGatewayStore;
use App\Support\Ui\Pulse;
use Illuminate\Contracts\View\View;
use Illuminate\Support\Facades\Gate;
use Livewire\Attributes\Layout;
use Livewire\Component;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

#[Layout('components.layouts.dashboard', ['skeleton' => 'form'])]
class EditComponent extends Component
{
    public string $gateway = '';

    public bool $enabled = false;

    public bool $live = false;

    public string $publicKey = '';

    public string $secretKey = '';

    public string $webhookSecret = '';

    public bool $clearPublic = false;

    public bool $clearSecret = false;

    public bool $clearWebhook = false;

    /**
     * @return array{title: string, breadcrumbs: list<array{label: string, href?: string, current?: bool}>}
     */
    public function layoutData(): array
    {
        $definition = PaymentCatalog::definition($this->gateway);

        return [
            'title' => $definition['title'] ?? __('dashboard.Payment Methods'),
            'breadcrumbs' => [
                ['label' => __('dashboard.Payment Methods'), 'href' => route('dashboard.payments.index')],
                ['label' => $definition['title'] ?? __('dashboard.Edit'), 'current' => true],
            ],
        ];
    }

    public function mount(string $gateway): void
    {
        Gate::authorize('payments.revise');

        if (PaymentCatalog::definition($gateway) === null) {
            throw new NotFoundHttpException(__('dashboard.Unknown payment method.'));
        }

        $this->gateway = $gateway;
        $this->hydrateFromStore();
    }

    public function save(PaymentGatewayStore $store): void
    {
        Gate::authorize('payments.revise');

        $this->validate([
            'enabled' => ['boolean'],
            'live' => ['boolean'],
            'publicKey' => ['nullable', 'string', 'max:400'],
            'secretKey' => ['nullable', 'string', 'max:400'],
            'webhookSecret' => ['nullable', 'string', 'max:400'],
        ]);

        $store->save($this->gateway, [
            'enabled' => $this->enabled,
            'mode' => $this->live ? 'live' : 'test',
            'public_key' => $this->publicKey !== '' ? $this->publicKey : null,
            'secret_key' => $this->secretKey !== '' ? $this->secretKey : null,
            'webhook_secret' => $this->webhookSecret !== '' ? $this->webhookSecret : null,
            'clear_public' => $this->clearPublic,
            'clear_secret' => $this->clearSecret,
            'clear_webhook' => $this->clearWebhook,
        ]);

        $this->hydrateFromStore();
        $this->pulseOk(__('dashboard.Payment method saved.'));
    }

    public function render(PaymentGatewayStore $store): View
    {
        $row = $store->get($this->gateway);
        $definition = PaymentCatalog::definition($this->gateway);

        return view('livewire.dashboard.payments.options.edit', [
            'definition' => $definition,
            'row' => $row,
        ])->layoutData($this->layoutData());
    }

    private function hydrateFromStore(): void
    {
        $row = app(PaymentGatewayStore::class)->get($this->gateway);
        $this->enabled = (bool) $row['enabled'];
        $this->live = $row['mode'] === 'live';
        $this->publicKey = '';
        $this->secretKey = '';
        $this->webhookSecret = '';
        $this->clearPublic = false;
        $this->clearSecret = false;
        $this->clearWebhook = false;
    }

    private function pulseOk(string $copy): void
    {
        $packet = Pulse::craft($copy, __('dashboard.Saved'), 'ok');
        $this->js(
            'window.dispatchEvent(new CustomEvent('.json_encode(Pulse::EVENT).', { detail: '.json_encode($packet).' }))'
        );
    }
}
