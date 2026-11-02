<?php

namespace App\Http\Controllers\Webhooks;

use App\Http\Controllers\Controller;
use App\Payments\Drivers\PaypalGateway;
use App\Payments\PaymentCatalog;
use App\Payments\PaymentGatewayStore;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class PaypalWebhookController extends Controller
{
    public function __invoke(Request $request, PaymentGatewayStore $store, PaypalGateway $paypal): Response
    {
        $payload = $request->getContent();

        if (! $paypal->verifyWebhook($payload, $request->headers->all())) {
            return response('invalid signature', 400);
        }

        $event = json_decode($payload, true);
        if (! is_array($event)) {
            return response('invalid payload', 400);
        }

        $store->recordEvent(
            PaymentCatalog::PAYPAL,
            (string) ($event['event_type'] ?? 'unknown'),
            isset($event['id']) ? (string) $event['id'] : null,
            $event,
        );

        return response('ok', 200);
    }
}
