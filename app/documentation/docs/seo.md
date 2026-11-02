# SEO

Set global SEO defaults for your marketing site and shared layouts.

**Location:** Dashboard → **Admin** → **Settings** → **SEO**  
**URL:** `/dashboard/settings/seo`

## Default meta

Configure site-wide:

- **Meta title** and **description** templates
- **Open Graph image** for social sharing
- Default keywords where supported

Individual **Pages** and **Blogs** can override per-entry fields on their edit forms.

## Search verification

Add verification tags for:

- **Google Search Console**
- **Bing Webmaster Tools**

Paste the meta tag content or verification string provided by each service.

## Best practices

- Use your [Application URL](/docs/general-settings) with HTTPS before verifying domains
- Keep OG images at least 1200×630 px for consistent previews
- After changes, clear CDN or config cache if you use `php artisan config:cache` in production

---
