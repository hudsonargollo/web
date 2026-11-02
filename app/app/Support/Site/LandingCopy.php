<?php

namespace App\Support\Site;

use App\Support\Content\PublicIndex;
use Illuminate\Support\Facades\Storage;

final class LandingCopy
{
    public function __construct(private readonly SiteSettings $site) {}

    /**
     * @return array<string, mixed>
     */
    public static function defaults(): array
    {
        return [
            'header' => [
                'links' => [
                    ['label' => 'About', 'href' => '#about'],
                    ['label' => 'Platform', 'href' => '#platform'],
                    ['label' => 'Use cases', 'href' => '#agents'],
                    ['label' => 'Pricing', 'href' => 'pricing'],
                    ['label' => 'Blog', 'href' => 'blog'],
                    ['label' => 'Overview', 'href' => '#overview'],
                ],
                'guest_link_label' => 'Log in',
                'guest_link_href' => 'login',
                'guest_cta_label' => 'Register',
                'guest_cta_href' => 'register',
                'auth_link_label' => '',
                'auth_cta_label' => '',
                'mobile_cta_label' => 'Contact',
                'mobile_cta_href' => 'contact',
            ],
            'hero' => [
                'eyebrow' => 'Introducing Lab',
                'title' => 'The workshop sites need to run from a single brief',
                'copy' => 'Launch pages that write files, preview live, and publish — without leaving the desk.',
                'primary_label' => 'Start a brief',
                'primary_href' => '',
                'secondary_label' => 'See Lab in action',
                'secondary_href' => '#walkthrough',
                'footnote' => 'Free pack with monthly Lab credits. Upgrade when you need more projects or domains.',
            ],
            'problem' => [
                'title' => 'Most teams still juggle a chat thread, a file export, and a separate preview tab just to ship one page. Lab keeps the brief, the files, and the canvas on one shared desk.',
                'copy' => 'Outcome: a clickable preview in one sitting, markup you can open, and publish when the draft holds.',
            ],
            'platform' => [
                'eyebrow' => 'Platform',
                'title' => 'A shared desk for every brief',
                'copy' => 'Centralize the prompt, the file tree, and the live preview so nothing lives in a side chat.',
                'layers' => [
                    ['title' => 'Brief access', 'copy' => 'Every project keeps the prompt, files, and preview together so the next turn has context.'],
                    ['title' => 'Canvas updates', 'copy' => 'The preview refreshes as files land. No export step to see what changed.'],
                    ['title' => 'File memory', 'copy' => 'Markup stays in the tree. Come back later and pick up the same pages.'],
                    ['title' => 'Publish controls', 'copy' => 'Preview, domain, and GitHub import sit behind the same workspace permissions.'],
                    ['title' => 'Workspace-ready', 'copy' => 'Roles, sessions, and pack limits travel with the account — not a separate admin product.'],
                ],
                'quote' => 'We went from a sentence to a page we could click through before the meeting ended.',
                'quote_name' => 'Studio lead',
                'quote_role' => 'Independent practice',
                'stats' => [
                    'One desk',
                    'Real files',
                    'Pack credits',
                    'Your domain',
                ],
            ],
            'agents' => [
                'title' => 'Ship the pages teams actually need',
                'copy' => 'Lab is used for the pages teams actually ship.',
                'items' => [
                    ['title' => 'Studio', 'copy' => 'Portfolios, case studies, and visit pages from one brief.'],
                    ['title' => 'Shop', 'copy' => 'Catalog grids and product pages you can open as files.'],
                    ['title' => 'Docs', 'copy' => 'Guides and reference pages that stay in the same tree.'],
                    ['title' => 'Events', 'copy' => 'Landing pages with dates, speakers, and tickets — then a domain.'],
                    ['title' => 'Agency', 'copy' => 'Keep client drafts in Lab until they say ship. Files travel with the project.'],
                    ['title' => 'Internal tools', 'copy' => 'A brief gets you a working first pass without waiting on a sprint.'],
                ],
            ],
            'walkthrough' => [
                'eyebrow' => 'Product walkthrough',
                'title' => 'See Lab in action',
                'copy' => 'Brief on the left, canvas on the right — from kickoff to a live page in one sitting.',
                'ascii_source' => null,
                'tabs' => [
                    [
                        'label' => 'Write the brief',
                        'title' => 'Say what the site is for',
                        'copy' => 'Lab turns the brief into pages, type, and layout you can keep editing.',
                        'image' => 'https://picsum.photos/seed/krikkit-walk-01/1200/800',
                    ],
                    [
                        'label' => 'Review the canvas',
                        'title' => 'Watch the preview update',
                        'copy' => 'Open a file when you want a precise change. The canvas is a preview of those files.',
                        'image' => 'https://picsum.photos/seed/krikkit-walk-02/1200/800',
                    ],
                    [
                        'label' => 'Edit the files',
                        'title' => 'Real markup you can open',
                        'copy' => 'Builders hide the markup. Lab writes files in the tree — not a separate document.',
                        'image' => 'https://picsum.photos/seed/krikkit-walk-03/1200/800',
                    ],
                    [
                        'label' => 'Publish when ready',
                        'title' => 'Ship with a clear view',
                        'copy' => 'Preview first. Attach a domain when you are ready. Roll back by editing the files.',
                        'image' => 'https://picsum.photos/seed/krikkit-walk-04/1200/800',
                    ],
                ],
            ],
            'integrations' => [
                'eyebrow' => 'Integrations',
                'title' => 'Connect the desk to what you already run.',
                'cta_label' => 'View pricing',
                'cta_href' => 'pricing',
            ],
            'faq' => [
                'title' => 'Frequently asked questions',
                'items' => [
                    ['q' => 'What is Lab?', 'a' => 'Lab is the Krikkit workspace where a written brief becomes a working front-end — files, preview, and publish in one desk.'],
                    ['q' => 'How is Lab different from a page builder?', 'a' => 'Builders hide the markup. Lab writes files you can open. The canvas is a preview of those files, not a separate document.'],
                    ['q' => 'How long does a first page take?', 'a' => 'Most briefs show a clickable preview in one sitting. Fine edits happen in the file tree when you want them.'],
                    ['q' => 'How do packs work?', 'a' => 'Free, Pro, and Agency set project ceilings, monthly Lab credits, domains, export, and GitHub import.'],
                    ['q' => 'Can I use my own domain?', 'a' => 'Custom domains unlock on Pro and Agency. Preview is available while you work.'],
                ],
            ],
            'cta' => [
                'copy' => 'Run the next site from Lab. Start with a brief. Review the canvas. Publish when it holds.',
                'primary_label' => 'Start a brief',
                'primary_href' => '',
                'guest_secondary_label' => 'Get in touch',
                'guest_secondary_href' => 'contact',
            ],
            'footer' => [
                'blurb' => 'Start with a brief. Review the canvas. Publish when it holds.',
                'subscribe_placeholder' => 'you@example.com',
                'subscribe_label' => 'Join',
                'columns' => [
                    [
                        'heading' => 'Pages',
                        'links' => [
                            ['label' => 'About', 'href' => '#about'],
                            ['label' => 'Blog', 'href' => 'blog'],
                            ['label' => 'Walkthrough', 'href' => '#walkthrough'],
                            ['label' => 'Contact', 'href' => 'contact'],
                            ['label' => 'Use cases', 'href' => '#agents'],
                            ['label' => 'Integrations', 'href' => '#integrations'],
                        ],
                    ],
                    [
                        'heading' => 'Company',
                        'links' => [
                            ['label' => 'About', 'href' => '#about'],
                            ['label' => 'Use cases', 'href' => '#agents'],
                            ['label' => 'Overview', 'href' => '#overview'],
                            ['label' => 'Pricing', 'href' => 'pricing'],
                            ['label' => 'Contact', 'href' => 'contact'],
                        ],
                    ],
                    [
                        'heading' => 'Resources',
                        'links' => [
                            ['label' => 'Documentation', 'href' => 'https://doc.krikkit.space'],
                            ['label' => 'Help center', 'href' => 'https://doc.krikkit.space'],
                            ['label' => 'Live demo', 'href' => 'https://krikkit.space'],
                            ['label' => 'FAQ', 'href' => '#questions'],
                        ],
                    ],
                ],
                'legal_heading' => 'Legal',
                'legal_extra' => ['Security', 'Cookies'],
                'social' => [
                    ['label' => 'Twitter', 'href' => ''],
                    ['label' => 'LinkedIn', 'href' => ''],
                    ['label' => 'GitHub', 'href' => ''],
                    ['label' => 'YouTube', 'href' => ''],
                ],
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function all(): array
    {
        $copy = $this->merge(self::defaults(), $this->site->bag('landing'));

        if (isset($copy['header']['links']) && is_array($copy['header']['links'])) {
            $copy['header']['links'] = $this->retargetPricingLinks($copy['header']['links']);
            $copy['header']['links'] = $this->retargetContactLinks($copy['header']['links']);
        }

        if (isset($copy['header']) && is_array($copy['header'])) {
            $copy['header'] = $this->normalizeGuestAuthButtons($copy['header']);
        }

        if (isset($copy['hero']) && is_array($copy['hero'])) {
            $copy['hero'] = $this->normalizeGuidedDemoLink($copy['hero']);
        }

        $ctaHref = trim((string) ($copy['cta']['guest_secondary_href'] ?? ''));
        if (in_array($ctaHref, ['login', '#start', ''], true)) {
            $copy['cta']['guest_secondary_href'] = 'contact';
        }

        foreach ($copy['footer']['columns'] ?? [] as $index => $column) {
            if (! is_array($column) || ! isset($column['links']) || ! is_array($column['links'])) {
                continue;
            }
            $copy['footer']['columns'][$index]['links'] = $this->retargetPricingLinks($column['links']);
            $copy['footer']['columns'][$index]['links'] = $this->retargetContactLinks($column['links']);
        }

        return $copy;
    }

    /**
     * @return array<string, mixed>
     */
    public function section(string $key): array
    {
        $all = $this->all();
        $section = $all[$key] ?? [];

        return is_array($section) ? $section : [];
    }

    public function href(?string $stored, string $fallback = '#'): string
    {
        $stored = trim((string) $stored);
        if ($stored === '') {
            return $fallback;
        }

        return match ($stored) {
            'lab' => route('lab'),
            'dashboard' => route('dashboard.home'),
            'login' => route('login'),
            'register' => route('register'),
            'home' => route('home'),
            'pricing' => route('pricing'),
            '#pricing' => route('pricing'),
            'contact' => route('contact'),
            'blog' => $this->blogHref(),
            default => $stored,
        };
    }

    public function guestEntryHref(): string
    {
        return $this->site->allowRegistration() ? route('register') : route('login');
    }

    public function mediaUrl(?string $value, ?string $fallback = null): string
    {
        $value = trim((string) $value);
        if ($value === '') {
            return (string) $fallback;
        }

        if (str_starts_with($value, 'http://') || str_starts_with($value, 'https://') || str_starts_with($value, '/')) {
            return $value;
        }

        return Storage::disk('public')->url($value);
    }

    public function asciiUrl(): string
    {
        $walk = $this->section('walkthrough');

        return $this->mediaUrl(
            is_string($walk['ascii_source'] ?? null) ? $walk['ascii_source'] : null,
            asset('images/home/ascii-source.png'),
        );
    }

    /**
     * @return list<array{label: string, title: string, copy: string, image: string}>
     */
    public function walkTabs(): array
    {
        $tabs = $this->section('walkthrough')['tabs'] ?? [];
        if (! is_array($tabs)) {
            return [];
        }

        $out = [];
        foreach ($tabs as $tab) {
            if (! is_array($tab)) {
                continue;
            }
            $out[] = [
                'label' => (string) ($tab['label'] ?? ''),
                'title' => (string) ($tab['title'] ?? ''),
                'copy' => (string) ($tab['copy'] ?? ''),
                'image' => $this->mediaUrl(
                    is_string($tab['image'] ?? null) ? $tab['image'] : null,
                    'https://picsum.photos/seed/krikkit-walk/1200/800',
                ),
            ];
        }

        return $out;
    }

    /**
     * @return list<array{label: string, href: string}>
     */
    public function headerLinks(bool $hasBlog): array
    {
        $links = $this->section('header')['links'] ?? [];
        if (! is_array($links)) {
            return [];
        }

        $out = [];
        foreach ($links as $link) {
            if (! is_array($link)) {
                continue;
            }
            $href = trim((string) ($link['href'] ?? ''));
            if ($href === 'blog' && ! $hasBlog) {
                $href = '#questions';
            }
            $out[] = [
                'label' => (string) ($link['label'] ?? ''),
                'href' => $this->href($href, '#'),
            ];
        }

        return $out;
    }

    private function blogHref(): string
    {
        return PublicIndex::blogIsLive()
            ? route('blog')
            : '#questions';
    }

    /**
     * Saved landing copy still used Contact / Join waitlist as the guest header actions.
     *
     * @param  array<string, mixed>  $header
     * @return array<string, mixed>
     */
    private function normalizeGuestAuthButtons(array $header): array
    {
        $linkLabel = trim((string) ($header['guest_link_label'] ?? ''));
        $linkHref = trim((string) ($header['guest_link_href'] ?? ''));
        if (strcasecmp($linkLabel, 'Contact') === 0 && in_array($linkHref, ['contact', 'login', 'register', ''], true)) {
            $header['guest_link_label'] = 'Log in';
            $header['guest_link_href'] = 'login';
        }

        $ctaLabel = trim((string) ($header['guest_cta_label'] ?? ''));
        $ctaHref = trim((string) ($header['guest_cta_href'] ?? ''));
        if (strcasecmp($ctaLabel, 'Join waitlist') === 0 && in_array($ctaHref, ['', 'register', 'login', '#start', 'contact'], true)) {
            $header['guest_cta_label'] = 'Register';
            $header['guest_cta_href'] = 'register';
        }

        $mobileLabel = trim((string) ($header['mobile_cta_label'] ?? ''));
        $mobileHref = trim((string) ($header['mobile_cta_href'] ?? ''));
        if (strcasecmp($mobileLabel, 'Book a demo') === 0 && in_array($mobileHref, ['', 'login', 'register', '#start'], true)) {
            $header['mobile_cta_href'] = 'contact';
        }

        return $header;
    }

    /**
     * Saved landing copy still pointed the guided demo CTA at the walkthrough.
     *
     * @param  array<string, mixed>  $hero
     * @return array<string, mixed>
     */
    private function normalizeGuidedDemoLink(array $hero): array
    {
        $label = trim((string) ($hero['secondary_label'] ?? ''));
        $href = trim((string) ($hero['secondary_href'] ?? ''));
        if (
            strcasecmp($label, 'Book a guided demo') === 0
            && in_array($href, ['#walkthrough', '#questions', '#start', 'login', 'register', ''], true)
        ) {
            $hero['secondary_href'] = 'contact';
        }

        return $hero;
    }

    /**
     * Saved landing copy still pointed Contact at login.
     *
     * @param  list<mixed>  $links
     * @return list<mixed>
     */
    private function retargetContactLinks(array $links): array
    {
        foreach ($links as $index => $link) {
            if (! is_array($link)) {
                continue;
            }
            if (strcasecmp((string) ($link['label'] ?? ''), 'Contact') !== 0) {
                continue;
            }

            $href = trim((string) ($link['href'] ?? ''));
            if (in_array($href, ['login', 'register', '#start', ''], true)) {
                $links[$index]['href'] = 'contact';
            }
        }

        return $links;
    }

    /**
     * Saved landing copy still pointed Pricing at the waitlist CTA.
     *
     * @param  list<mixed>  $links
     * @return list<mixed>
     */
    private function retargetPricingLinks(array $links): array
    {
        foreach ($links as $index => $link) {
            if (! is_array($link)) {
                continue;
            }
            if (strcasecmp((string) ($link['label'] ?? ''), 'Pricing') !== 0) {
                continue;
            }

            $href = trim((string) ($link['href'] ?? ''));
            if (in_array($href, ['#pricing', '#start', ''], true)) {
                $links[$index]['href'] = 'pricing';
            }
        }

        return $links;
    }

    /**
     * @param  array<string, mixed>  $base
     * @param  array<string, mixed>  $over
     * @return array<string, mixed>
     */
    private function merge(array $base, array $over): array
    {
        foreach ($over as $key => $value) {
            if (is_array($value) && isset($base[$key]) && is_array($base[$key]) && $this->associative($base[$key])) {
                $base[$key] = $this->merge($base[$key], $value);

                continue;
            }

            $base[$key] = $value;
        }

        return $base;
    }

    /**
     * @param  array<mixed>  $value
     */
    private function associative(array $value): bool
    {
        return $value !== [] && array_keys($value) !== range(0, count($value) - 1);
    }
}
