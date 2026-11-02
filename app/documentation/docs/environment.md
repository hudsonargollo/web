# Environment Configuration

Copy `.env.example` to `.env` and set values for your host. The web installer writes database credentials and `APP_URL`; add the rest before going live. Dashboard settings override most of these.

## Core

```env
APP_NAME=Krikkit
APP_URL=https://yourdomain.com
APP_ENV=production
APP_DEBUG=false
```

## Database & cache

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_DATABASE=krikkit
DB_USERNAME=
DB_PASSWORD=

SESSION_DRIVER=database
CACHE_STORE=database
QUEUE_CONNECTION=database
```

## License

```env
PERMIT_ENDPOINT=https://deep42.co/api/deepthought/verify
```

## AI providers (Lab)

At least one key is required — demo mode is off by default.

```env
AI_DEFAULT_MODEL=claude-sonnet-4-5
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
```

See **Dashboard → API Integration** for the full provider list. Workspace keys override `.env`.

## Payments

```env
STRIPE_PUBLIC_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
```

Webhook URLs: `{APP_URL}/webhooks/stripe` and `{APP_URL}/webhooks/paypal`.

## Lab integrations

```env
GITHUB_OAUTH_CLIENT_ID=
GITHUB_OAUTH_CLIENT_SECRET=
SUPABASE_OAUTH_CLIENT_ID=
SUPABASE_OAUTH_CLIENT_SECRET=

# Unsplash — search uses Access Key only
UNSPLASH_APPLICATION_ID=
UNSPLASH_ACCESS_KEY=
UNSPLASH_SECRET_KEY=
PIXABAY_API_KEY=
```

Dashboard → API Integration is preferred over `.env` for these keys.

## Publish

```env
LAB_PUBLISH_ARTIFACT_MAX_BYTES=52428800
LAB_PUBLISH_ARTIFACT_MAX_FILES=5000
```