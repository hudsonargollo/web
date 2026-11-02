<?php

namespace App\Lab\Build;

use App\Models\Build;

/**
 * Single place where a MoneyMachine brief becomes model instructions.
 * Both build kinds share the static-output contract; only the narrative differs.
 */
final readonly class BuildBrief
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function __construct(
        public array $data,
        public string $kind,
    ) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public static function fromArray(string $kind, array $data): self
    {
        return new self($data, $kind === Build::KIND_PROPOSAL ? Build::KIND_PROPOSAL : Build::KIND_SITE);
    }

    public function locale(): string
    {
        $locale = strtolower(trim((string) ($this->data['locale'] ?? 'en')));

        return $locale !== '' ? substr($locale, 0, 12) : 'en';
    }

    public function prompt(): string
    {
        return $this->kind === Build::KIND_PROPOSAL
            ? $this->proposalPrompt()
            : $this->sitePrompt();
    }

    private function sitePrompt(): string
    {
        $design = is_array($this->data['design'] ?? null) ? $this->data['design'] : [];
        $business = is_array($this->data['business'] ?? null) ? $this->data['business'] : [];
        $sections = is_array($design['sections'] ?? null) ? $design['sections'] : [];
        $keywords = is_array($this->data['seo_keywords'] ?? null) ? $this->data['seo_keywords'] : [];

        $lines = [
            'Build a production-ready static marketing site.',
            '',
            'NICHE: '.$this->value($this->data['niche'] ?? null),
            'PRIMARY KEYWORD: '.$this->value($this->data['seed_keyword'] ?? null),
            'AUDIENCE: '.$this->value($this->data['target_audience'] ?? null),
            'CONTENT LANGUAGE: '.$this->locale(),
            'THEME: '.$this->value($design['theme'] ?? null),
            'PRIMARY COLOR: '.$this->value($design['primary_color'] ?? null),
            'BUSINESS NAME: '.$this->value($business['name'] ?? null),
            'PHONE: '.$this->value($business['phone'] ?? null),
            'ADDRESS: '.$this->value($business['address'] ?? null),
            'SECTIONS IN ORDER: '.($sections === [] ? 'Hero, Services, Proof, Contact' : implode(', ', array_map('strval', $sections))),
            'SEO KEYWORDS: '.($keywords === [] ? 'derive from the niche and keyword above' : implode(', ', array_map('strval', $keywords))),
            '',
            $this->staticContract(),
            '',
            'Copy must be specific to this niche and audience. Describe services concretely; never invent credentials, guarantees, team members, prices, or reviews.',
            '',
            'Start by writing index.html in full. Then write the stylesheet and any script. Use write_file for every file.',
        ];

        return implode("\n", $lines);
    }

    private function proposalPrompt(): string
    {
        $business = is_array($this->data['business'] ?? null) ? $this->data['business'] : [];
        $audit = is_array($this->data['audit'] ?? null) ? $this->data['audit'] : [];
        $offer = is_array($this->data['offer'] ?? null) ? $this->data['offer'] : [];
        $design = is_array($this->data['design'] ?? null) ? $this->data['design'] : [];

        $lines = [
            'Build a one-page proposal site that pitches a website redesign to one specific business.',
            '',
            'BUSINESS: '.$this->value($business['name'] ?? null),
            'CURRENT SITE: '.$this->value($business['url'] ?? null),
            'PHONE: '.$this->value($business['phone'] ?? null),
            'AUDIT SCORE: '.$this->value($audit['score'] ?? null).'/100',
            'CONTENT LANGUAGE: '.$this->locale(),
            'PRIMARY COLOR: '.$this->value($design['primary_color'] ?? null),
            '',
            'WHAT ALREADY WORKS (verbatim findings):',
            $this->bullets($audit['good'] ?? null),
            '',
            'WHAT IS COSTING THEM CUSTOMERS (verbatim findings):',
            $this->bullets($audit['bad'] ?? null),
            '',
            'PROPOSED FIXES (verbatim):',
            $this->bullets($audit['fix'] ?? null),
            '',
            'INVESTMENT: '.$this->money($offer['price_usd'] ?? null).' for the site',
            'OPTIONAL CONSULTING: '.$this->money($offer['consult_addon_usd'] ?? null),
            'ROADMAP: '.$this->value($offer['roadmap_days'] ?? null).' days',
            '',
            'HARD RULES — a proposal that invents evidence is worse than no proposal:',
            '1. Use ONLY the facts listed above. Never invent testimonials, client counts, traffic, revenue, rankings, awards, or metrics.',
            '2. Never state or imply that the business approved, requested, or reviewed this page.',
            '3. Present audit findings as observations, never as guaranteed outcomes. Do not promise rankings, revenue, or conversion numbers.',
            '4. Every number on the page must trace to this brief. If a value is missing, omit it.',
            '5. Do not name or reference competitors.',
            '6. Do not add stock-photo people or logos that imply a real team or client base.',
            '',
            'SECTIONS IN ORDER: Hero (business name, audit score, one-line verdict), What already works, What it is costing you, The plan, Investment, Next step (single clear CTA, phone if known).',
            '',
            $this->staticContract(),
            '',
            'Start by writing index.html in full, then the stylesheet. Use write_file for every file.',
        ];

        return implode("\n", $lines);
    }

    private function staticContract(): string
    {
        return implode("\n", [
            'OUTPUT CONTRACT (non-negotiable):',
            '1. Emit a self-contained static site: index.html at the workspace root, stylesheet at assets/site.css, optional script at assets/site.js.',
            '2. No build step, no npm, no bundler, no framework imports (React/Vue/Svelte/Vite), no TypeScript, no JSX.',
            '3. Reference assets root-relative, e.g. "/assets/site.css".',
            '4. Responsive from 360px to 1440px. One <h1>. Labelled form fields. Visible focus states. Text contrast at least 4.5:1.',
            '5. Include <meta name="description"> and Open Graph tags. Add JSON-LD LocalBusiness only when a business name is known.',
            '6. No lorem ipsum. No placeholder brackets except contact details the brief did not supply.',
            '7. Write only site files — no README, docs, package.json, or lockfiles.',
        ]);
    }

    private function bullets(mixed $value): string
    {
        if (! is_array($value) || $value === []) {
            return '- (none supplied)';
        }

        return implode("\n", array_map(
            static fn ($item): string => '- '.trim((string) $item),
            array_slice(array_values($value), 0, 20),
        ));
    }

    private function money(mixed $value): string
    {
        if (! is_numeric($value)) {
            return '(not supplied)';
        }

        return 'USD '.number_format((float) $value, 0);
    }

    private function value(mixed $value): string
    {
        if ($value === null || $value === '' || $value === []) {
            return '(not supplied)';
        }

        return is_scalar($value) ? (string) $value : (string) json_encode($value);
    }
}
