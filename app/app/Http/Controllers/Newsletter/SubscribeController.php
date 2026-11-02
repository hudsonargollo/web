<?php

namespace App\Http\Controllers\Newsletter;

use App\Http\Controllers\Controller;
use App\Mail\NewsletterJoinedMail;
use App\Models\NewsletterSubscriber;
use App\Support\Site\SiteSettings;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Throwable;

class SubscribeController extends Controller
{
    public function store(Request $request, SiteSettings $site): RedirectResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email:filter', 'max:255'],
        ]);

        $email = strtolower(trim($validated['email']));
        $existing = NewsletterSubscriber::query()->where('email', $email)->first();

        if ($existing === null) {
            $row = NewsletterSubscriber::query()->create([
                'email' => $email,
                'ip' => $request->ip(),
                'confirmed_at' => now(),
            ]);

            try {
                $site->applyMailConfig();
                Mail::to($email)->send(new NewsletterJoinedMail($row));
            } catch (Throwable $e) {
                report($e);
            }
        }

        return redirect()
            ->to(route('home').'#subscribe')
            ->with('newsletter', 'ok');
    }
}
