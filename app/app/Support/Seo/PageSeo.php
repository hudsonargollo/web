<?php

namespace App\Support\Seo;

use App\Support\Html\SafeHtml;
use App\Support\Site\SiteSettings;
use Artesaos\SEOTools\Facades\SEOTools;
use DateTimeInterface;
use Illuminate\Http\Request;

final class PageSeo
{
    public const TITLE_HOME = '{name} | {page}';

    public const TITLE_DASHBOARD = 'Dashboard | {page}';

    public const TITLE_LAB = '{name} Lab | {page}';

    private bool $ready = false;

    public function __construct(private SiteSettings $site) {}

    public function reset(): void
    {
        $this->ready = false;
    }

    public function hydrate(?Request $request = null): void
    {
        if ($this->ready) {
            return;
        }

        $this->ready = true;
        $request ??= request();
        $bag = $this->site->bag('seo');
        $name = $this->site->name();
        $title = $this->composeTitle('');
        $description = trim((string) ($bag['meta_description'] ?? ''));
        if ($description === '') {
            $description = $this->site->tagline();
        }
        $keywords = $this->keywordList((string) ($bag['meta_keywords'] ?? ''));
        $canonical = $this->defaultCanonical($request, (string) ($bag['canonical'] ?? ''));
        $ogTitle = trim((string) ($bag['og_title'] ?? ''));
        $ogTitle = $ogTitle !== '' ? $ogTitle : $title;
        $ogDescription = trim((string) ($bag['og_description'] ?? ''));
        $ogDescription = $ogDescription !== '' ? $ogDescription : $description;
        $image = $this->site->assetUrl($bag['og_image'] ?? null);
        $twitter = ltrim((string) ($bag['twitter_handle'] ?? ''), '@');
        $searchConsole = trim((string) ($bag['search_console'] ?? ''));
        $private = $this->isPrivateSurface($request);
        $index = ! $private && (bool) ($bag['robots_index'] ?? true);
        $follow = ! $private && (bool) ($bag['robots_follow'] ?? true);

        SEOTools::setTitle($title, false);
        if ($description !== '') {
            SEOTools::setDescription($description);
        }
        if ($keywords !== []) {
            SEOTools::metatags()->setKeywords($keywords);
        }
        SEOTools::metatags()->setRobots($this->robots($index, $follow));
        SEOTools::setCanonical($canonical);
        SEOTools::opengraph()->setTitle($ogTitle);
        if ($ogDescription !== '') {
            SEOTools::opengraph()->setDescription($ogDescription);
        }
        SEOTools::opengraph()->setUrl($canonical);
        SEOTools::opengraph()->setType('website');
        SEOTools::opengraph()->setSiteName($name);
        SEOTools::twitter()->setType($image ? 'summary_large_image' : 'summary');
        SEOTools::jsonLd()->setType($private ? 'WebPage' : 'WebSite');
        SEOTools::jsonLd()->setTitle($title);
        if ($description !== '') {
            SEOTools::jsonLd()->setDescription($description);
        }
        SEOTools::jsonLd()->setUrl($canonical);

        if (is_string($image) && $image !== '') {
            SEOTools::addImages($image);
        }

        if ($twitter !== '') {
            SEOTools::twitter()->setSite('@'.$twitter);
        }

        if ($searchConsole !== '') {
            SEOTools::metatags()->addMeta('google-site-verification', $searchConsole);
        }
    }

    /**
     * @param  array{
     *     title?: string,
     *     description?: string,
     *     canonical?: string,
     *     image?: string|null,
     *     type?: string,
     *     jsonLd?: string,
     *     keywords?: string,
     *     index?: bool,
     *     follow?: bool,
     *     raw?: bool,
     *     published?: DateTimeInterface|null
     * }  $page
     */
    public function page(array $page): void
    {
        $this->hydrate();

        $title = trim((string) ($page['title'] ?? ''));
        if ($title !== '' || array_key_exists('title', $page)) {
            $this->applyTitle($title, (bool) ($page['raw'] ?? false));
        }

        $description = trim((string) ($page['description'] ?? ''));
        if ($description !== '') {
            SEOTools::setDescription($description);
        }

        $canonical = trim((string) ($page['canonical'] ?? ''));
        if ($canonical !== '') {
            SEOTools::setCanonical($canonical);
            SEOTools::opengraph()->setUrl($canonical);
            SEOTools::jsonLd()->setUrl($canonical);
        }

        $image = $page['image'] ?? null;
        if (is_string($image) && $image !== '') {
            SEOTools::addImages($image);
        }

        $keywords = $this->keywordList((string) ($page['keywords'] ?? ''));
        if ($keywords !== []) {
            SEOTools::metatags()->setKeywords($keywords);
        }

        $type = trim((string) ($page['type'] ?? ''));
        if ($type !== '') {
            SEOTools::opengraph()->setType($type);
        }

        $jsonLd = trim((string) ($page['jsonLd'] ?? ''));
        if ($jsonLd !== '') {
            SEOTools::jsonLd()->setType($jsonLd);
        }

        if (array_key_exists('index', $page) || array_key_exists('follow', $page)) {
            $index = (bool) ($page['index'] ?? true);
            $follow = (bool) ($page['follow'] ?? true);
            SEOTools::metatags()->setRobots($this->robots($index, $follow));
        }

        $published = $page['published'] ?? null;
        if ($published instanceof DateTimeInterface) {
            SEOTools::metatags()->addMeta('article:published_time', $published->format(DATE_W3C), 'property');
            SEOTools::opengraph()->setArticle([
                'published_time' => $published->format(DATE_W3C),
            ]);
        }
    }

    public function syncLayoutTitle(?string $title): void
    {
        $title = trim((string) $title);
        if ($title === '') {
            return;
        }

        $this->hydrate();
        $this->applyTitle($title);
    }

    public function composeTitle(?string $page, ?string $surface = null): string
    {
        $surface ??= $this->surface();
        $name = $this->site->name();
        $page = trim((string) $page);
        $template = $this->titleTemplate($surface);
        $prefix = $this->fillTemplate($template, $name, '');

        if ($page !== '' && strcasecmp($page, $prefix) === 0) {
            $page = '';
        }

        if ($page === '') {
            $page = $this->fallbackPage($surface, $name, $prefix);
        }

        return $this->fillTemplate($template, $name, $page);
    }

    public function markup(): string
    {
        $this->hydrate();

        return SEOTools::generate();
    }

    public function surface(?Request $request = null): string
    {
        $request ??= request();

        if ($request->routeIs(['lab', 'lab.*']) || $request->is('lab', 'lab/*')) {
            return 'lab';
        }

        if ($request->routeIs('dashboard.*') || $request->is('dashboard', 'dashboard/*')) {
            return 'dashboard';
        }

        return 'home';
    }

    public function isPrivateSurface(?Request $request = null): bool
    {
        $request ??= request();

        if ($request->routeIs([
            'dashboard.*',
            'lab',
            'lab.*',
            'login',
            'register',
            'password.*',
            'twoFactorChallenge',
            'verification.*',
            'checkout.*',
            'billing.*',
            'installer.*',
            'settings',
            'settings.*',
        ])) {
            return true;
        }

        return $request->is('dashboard', 'dashboard/*', 'lab', 'lab/*', 'checkout', 'checkout/*', 'billing', 'billing/*', 'install', 'install/*', 'settings', 'settings/*');
    }

    public static function excerpt(?string $html, int $limit = 160): string
    {
        $plain = SafeHtml::plain((string) $html);

        if ($plain === '' || mb_strlen($plain) <= $limit) {
            return $plain;
        }

        return rtrim(mb_substr($plain, 0, $limit - 1)).'…';
    }

    private function applyTitle(string $page, bool $raw = false): void
    {
        $title = $raw ? $page : $this->composeTitle($page);
        if ($title === '') {
            return;
        }

        SEOTools::setTitle($title, false);
    }

    private function titleTemplate(string $surface): string
    {
        $key = match ($surface) {
            'dashboard' => 'title_dashboard',
            'lab' => 'title_lab',
            default => 'title_home',
        };
        $fallback = match ($surface) {
            'dashboard' => self::TITLE_DASHBOARD,
            'lab' => self::TITLE_LAB,
            default => self::TITLE_HOME,
        };
        $template = trim((string) $this->site->value('seo', $key, $fallback));

        return $template !== '' ? $template : $fallback;
    }

    private function fallbackPage(string $surface, string $name, string $prefix): string
    {
        if ($surface === 'home') {
            $meta = trim((string) $this->site->value('seo', 'meta_title', ''));
            if ($meta !== '' && strcasecmp($meta, $name) !== 0 && strcasecmp($meta, $prefix) !== 0) {
                return $meta;
            }

            $tagline = $this->site->tagline();
            if ($tagline !== '' && strcasecmp($tagline, $prefix) !== 0) {
                return $tagline;
            }

            return '';
        }

        if ($surface === 'dashboard' && strcasecmp($name, $prefix) !== 0) {
            return $name;
        }

        return '';
    }

    private function fillTemplate(string $template, string $name, string $page): string
    {
        $filled = str_replace(['{name}', '{page}'], [$name, $page], $template);

        if ($page === '') {
            $filled = preg_replace('/\s*[\|–—·\-]+\s*$/u', '', $filled) ?? $filled;
            $filled = preg_replace('/^\s*[\|–—·\-]+\s*/u', '', $filled) ?? $filled;
            $filled = preg_replace('/\s{2,}/', ' ', $filled) ?? $filled;
        }

        return trim($filled);
    }

    private function defaultCanonical(Request $request, string $fromSettings): string
    {
        $fromSettings = trim($fromSettings);

        if ($fromSettings !== '' && $request->routeIs('home')) {
            return $fromSettings;
        }

        return $request->url();
    }

    /**
     * @return list<string>
     */
    private function keywordList(string $raw): array
    {
        return array_values(array_filter(array_map(
            static fn (string $word): string => trim($word),
            explode(',', $raw),
        ), static fn (string $word): bool => $word !== ''));
    }

    private function robots(bool $index, bool $follow): string
    {
        return ($index ? 'index' : 'noindex').','.($follow ? 'follow' : 'nofollow');
    }
}
