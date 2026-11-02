<?php

namespace App\Http\Controllers\Billing;

use App\Finance\BillingInterval;
use App\Http\Controllers\Controller;
use App\Models\EntitlementPlan;
use App\Models\User;
use App\Payments\CheckoutDesk;
use App\Payments\Drivers\PaypalGateway;
use App\Payments\PaymentCatalog;
use App\Payments\PaymentGatewayStore;
use App\Support\Seo\PageSeo;
use App\Support\Site\HomePacks;
use App\Support\Site\SiteSettings;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\View\View;
use InvalidArgumentException;
use RuntimeException;

class CheckoutController extends Controller
{
    public function start(
        Request $request,
        string $plan,
        CheckoutDesk $desk,
        PageSeo $seo,
    ): RedirectResponse|View {
        $pack = EntitlementPlan::query()
            ->where('is_active', true)
            ->where(function ($query) use ($plan): void {
                $query->where('public_id', $plan)->orWhere('slug', $plan);
            })
            ->firstOrFail();

        $interval = $desk->interval((string) $request->query('interval', $request->input('interval', 'monthly')));
        $driver = $request->query('driver', $request->input('driver'));

        if ($pack->slug === 'free') {
            return redirect()->route('lab');
        }

        if ($this->isGratis($pack, $interval)) {
            return redirect()->route('contact', ['pack' => $pack->public_id]);
        }

        if ($plan !== $pack->public_id) {
            return redirect()->route('checkout.start', array_filter([
                'plan' => $pack,
                'interval' => $request->query('interval'),
                'driver' => $request->query('driver'),
            ]));
        }

        if (is_string($driver) && $driver !== '') {
            try {
                $session = $desk->start($request->user(), $pack, $interval, $driver);
            } catch (InvalidArgumentException|RuntimeException $e) {
                return redirect()->route('pricing')->with('checkout_error', $e->getMessage());
            }

            return redirect()->away($session['url']);
        }

        $seo->page(['title' => __('dashboard.Checkout'), 'index' => false, 'follow' => false]);

        return view('checkout.checkout', [
            'plan' => $pack,
            'interval' => $interval->value,
            'price' => $pack->formatPrice($interval->value),
            'drivers' => $desk->readyDrivers(),
            'features' => HomePacks::features($pack),
            'site' => app(SiteSettings::class),
            'account' => (string) $request->user()?->email,
        ]);
    }

    public function returned(Request $request, CheckoutDesk $desk, PageSeo $seo): RedirectResponse|View
    {
        $user = $request->user();
        if (! $user instanceof User || ! $desk->claimPaidReturn($user)) {
            abort(404);
        }

        if ($request->query->count() > 0) {
            return redirect()->route('billing.return');
        }

        $seo->page(['title' => __('dashboard.Thank you')]);

        return view('billing.return.return', [
            'ok' => true,
        ]);
    }

    public function cancelled(Request $request, PageSeo $seo): RedirectResponse|View
    {
        if ($request->query->count() > 0) {
            return redirect()->route('billing.cancel');
        }

        $seo->page(['title' => __('dashboard.No worries')]);

        return view('billing.return.return', [
            'ok' => false,
        ]);
    }

    public function paypalReturn(Request $request, PaypalGateway $paypal, PaymentGatewayStore $store): RedirectResponse
    {
        $expected = (string) session('checkout.paypal_order', '');
        $incoming = (string) $request->query('token', '');
        if ($expected === '' || $incoming === '' || $expected !== $incoming) {
            abort(404);
        }

        $token = $paypal->accessToken();
        $row = $store->get(PaymentCatalog::PAYPAL);
        if ($token === null) {
            abort(404);
        }

        $base = $row['mode'] === 'live'
            ? 'https://api-m.paypal.com'
            : 'https://api-m.sandbox.paypal.com';

        $response = Http::withToken($token)
            ->acceptJson()
            ->timeout(20)
            ->post($base.'/v2/checkout/orders/'.$expected.'/capture');

        if (! $response->successful() || (string) $response->json('status') !== 'COMPLETED') {
            abort(404);
        }

        session()->forget(['checkout.paypal_order', 'checkout.plan_slug', 'checkout.interval']);
        session(['billing.paid' => true]);

        return redirect()->route('billing.return');
    }

    private function isGratis(EntitlementPlan $plan, BillingInterval $interval): bool
    {
        $amount = $interval === BillingInterval::Yearly ? $plan->price_yearly : $plan->price_monthly;

        return $amount === null || $amount->isZero() || $amount->isNegative();
    }
}
