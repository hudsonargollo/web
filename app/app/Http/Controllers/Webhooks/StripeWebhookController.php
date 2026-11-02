<?php

namespace App\Http\Controllers\Webhooks;

use App\Http\Controllers\Controller;
use App\Payments\Drivers\StripeGateway;
use App\Payments\PaymentCatalog;
use App\Payments\PaymentGatewayStore;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class StripeWebhookController extends Controller
{
    public function __invoke(Request $request, PaymentGatewayStore $store, StripeGateway $stripe): Response
    {
        $payload = $request->getContent();
        $row = $store->get(PaymentCatalog::STRIPE);
        $secret = $row['webhook_secret'];
        $header = (string) $request->header('Stripe-Signature', '');

        if ($secret === '') {
            if (! app()->environment('local')) {
                return response('invalid signature', 400);
            }
        } elseif (! $stripe->signatureValid($payload, $header, $secret)) {
            return response('invalid signature', 400);
        }

        $event = json_decode($payload, true);
        if (! is_array($event)) {
            return response('invalid payload', 400);
        }

        $store->recordEvent(
            PaymentCatalog::STRIPE,
            (string) ($event['type'] ?? 'unknown'),
            isset($event['id']) ? (string) $event['id'] : null,
            $event,
        );

        return response('ok', 200);
    }
}
