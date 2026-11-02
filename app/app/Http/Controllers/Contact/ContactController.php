<?php

namespace App\Http\Controllers\Contact;

use App\Http\Controllers\Controller;
use App\Models\Contact;
use App\Models\EntitlementPlan;
use App\Support\Content\PublicIndex;
use App\Support\Seo\PageSeo;
use App\Support\Site\LandingCopy;
use App\Support\Site\SiteSettings;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

class ContactController extends Controller
{
    public function show(Request $request, SiteSettings $site, LandingCopy $landing, PageSeo $seo): View
    {
        $seo->page([
            'title' => __('home.Contact'),
            'description' => __('home.Write to us about Agency, custom packs, or anything else on the desk.'),
            'canonical' => route('contact'),
            'type' => 'website',
            'jsonLd' => 'WebPage',
        ]);

        $user = $request->user();
        $pack = $this->packFromRequest($request);

        return view('contact.contact', [
            'site' => $site,
            'landing' => $landing,
            'hasBlog' => PublicIndex::blogIsLive(),
            'pack' => $pack,
            'name' => old('name', (string) ($user?->name ?? '')),
            'email' => old('email', (string) ($user?->email ?? '')),
            'body' => old('body', ''),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        if (filled($request->input('website'))) {
            return redirect()->route('contact')->with('contact', 'ok');
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email:filter', 'max:255'],
            'body' => ['required', 'string', 'max:5000'],
            'pack' => ['nullable', 'string', 'max:26'],
        ]);

        $pack = $this->packFromPublicId((string) ($validated['pack'] ?? ''));

        Contact::query()->create([
            'user_id' => $request->user()?->id,
            'entitlement_plan_id' => $pack?->id,
            'name' => trim($validated['name']),
            'email' => strtolower(trim($validated['email'])),
            'body' => trim($validated['body']),
            'ip' => $request->ip(),
        ]);

        return redirect()
            ->route('contact')
            ->with('contact', 'ok');
    }

    private function packFromRequest(Request $request): ?EntitlementPlan
    {
        return $this->packFromPublicId((string) $request->query('pack', $request->old('pack', '')));
    }

    private function packFromPublicId(string $publicId): ?EntitlementPlan
    {
        if ($publicId === '') {
            return null;
        }

        return EntitlementPlan::query()
            ->where('is_active', true)
            ->where('public_id', $publicId)
            ->first();
    }
}
