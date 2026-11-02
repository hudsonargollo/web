<Callout>

**Welcome!** This guide helps you install **Krikkit** after purchasing on **CodeCanyon**. The recommended path is the built-in web installer at `/install`.

</Callout>

## Server requirements

Before you begin, make sure your server meets these requirements:

| Requirement | Minimum |
|-------------|---------|
| **PHP** | **8.3+** (required) |
| **Database** | MySQL 8+ or MariaDB 10.6+ (recommended for production) |
| **Composer** | 2.x |
| **Node.js** | 20+ |
| **npm** | 10+ |
| **Web server** | Apache or Nginx with URL rewriting |
| **Queue** | Database or Redis driver (required for builds and background jobs) |

### Required PHP extensions

- `bcmath`, `ctype`, `curl`, `fileinfo`, `json`, `mbstring`, `openssl`, `pdo`, `tokenizer`, `xml`

### Recommended PHP extensions

- `gd`, `zip`

### Writable directories

- `storage/`
- `bootstrap/cache/`

<Steps>

### Step 1: Download from CodeCanyon

1. Log in to your [CodeCanyon](https://codecanyon.net) account.
2. Open **Downloads** and download the latest **Krikkit** package.
3. Extract the archive on your computer.
4. Upload the project files to your server (document root or subdomain folder).

The CodeCanyon zip should include a prebuilt `public/build` directory. If you rebuild assets yourself before packaging or deploying, run `npm install && npm run build` so the site does not fall back to the Tailwind CDN.

### Step 2: Set permissions

On Linux hosting, ensure Laravel can write logs, cache, and uploads:

```bash
chmod -R 755 storage bootstrap/cache
```

If your host requires it, set the web server user as owner of `storage` and `bootstrap/cache`.

### Step 3: Open the installer

Point your browser to your site. If the app is not yet installed, you are redirected to the installer:

```
https://yourdomain.com/install
```

### Step 4: Follow the installation wizard

The Hitchhiker wizard runs these steps:

1. **Requirements** — PHP **8.3+**, extensions, memory limit
2. **Permissions** — Writable `storage` and `bootstrap/cache`
3. **License** — CodeCanyon purchase code (**optional**; leave empty to continue, then bind later under **Settings → License**)
4. **Environment** — Database credentials and `APP_URL`
5. **Migrations** — Creates all tables
6. **Create Admin** — You choose the owner email, name, and password (Owner role + Agency pack)

When the installer finishes, sign in at `/login` with the **admin account you created** in the last step. There is no fixed default email/password from the web installer.

</Steps>

## Manual installation (advanced)

Use this path only if the web installer is unavailable (CLI-only server, custom deploy pipeline, etc.).

### 1. Install PHP dependencies

```bash
composer install --no-dev --optimize-autoloader
```

Use PHP **8.3+** for all `php` and `composer` commands.

### 2. Environment file

```bash
cp .env.example .env
php artisan key:generate
```

Edit `.env` with your database, `APP_URL`, and mail settings:

```env
APP_URL=https://yourdomain.com

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=your_database
DB_USERNAME=your_username
DB_PASSWORD=your_password

QUEUE_CONNECTION=database
```

### 3. Database

```bash
php artisan migrate --force
php artisan db:seed --force
```

Manual seed creates (or updates) an owner account at `admin@deep42.co` with password `12345678` **only when that user is newly created or has no password yet**. Change it immediately on any public host. Prefer the web installer’s **Create Admin** step so you set your own credentials from the start.

### 4. Frontend assets

```bash
npm install
npm run build
```

### 5. Storage link

```bash
php artisan storage:link
```

### 6. Optimize for production

```bash
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

## Post-installation

After the installer or manual setup:

### Platform essentials

- **Admin account** — Created during the installer (or via seeder on manual installs)
- **License** — Optional. If you skipped it during install, open **Settings → License** and bind your purchase code when ready
- **Site settings** — App name, branding, and general options in the admin panel
- **SMTP** — Configure mail for registration, billing, and notifications

### AI builder (Lab)

Lab needs at least one provider API key. Set keys in `.env` (see [Environment](/environment)) or under the Lab / AI settings in the dashboard:

```env
AI_DEFAULT_MODEL=claude-sonnet-4-5
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
```

Other supported providers (optional): `XAI_API_KEY`, `DEEPSEEK_API_KEY`, `GROQ_API_KEY`, `MISTRAL_API_KEY`, `ZHIPUAI_API_KEY`, `GOOGLE_AI_API_KEY`.

Krikkit’s Lab preview runtime ships in the package. Without a provider key, Lab chat cannot call a model — configure a key before testing generation.

### Billing

- Configure **Stripe** and/or **PayPal** in **Settings → Payment gateways** (or the finance / payment screens in the dashboard)
- Register webhooks with your public URL:
  - Stripe: `https://yourdomain.com/webhooks/stripe`
  - PayPal: `https://yourdomain.com/webhooks/paypal`

### Background processes (production)

Krikkit relies on queues and the scheduler for builds, billing, and maintenance.

**Queue worker** (Supervisor example):

```ini
[program:krikkit-worker]
process_name=%(program_name)s_%(process_num)02d
command=php /path/to/artisan queue:work --sleep=3 --tries=3 --max-time=3600
autostart=true
autorestart=true
user=www-data
numprocs=1
redirect_stderr=true
stdout_logfile=/path/to/storage/logs/worker.log
```

**Cron** (Laravel scheduler):

```cron
* * * * * cd /path/to/your-app && php artisan schedule:run >> /dev/null 2>&1
```

### Local development

For local work on your machine:

```bash
composer run dev
```

This runs the Laravel server, queue listener, logs, and Vite together.

## Production checklist

- `APP_ENV=production`
- `APP_DEBUG=false` (never enable on public hosts)
- `APP_URL` set to your HTTPS domain
- PHP **8.3+** on the server and CLI
- Prebuilt or freshly built `public/build` assets deployed with the app
- Queue worker supervised (Supervisor or systemd)
- Cron configured for `schedule:run`
- Stripe/PayPal webhooks verified at `/webhooks/stripe` and `/webhooks/paypal`
- Secure session cookies behind HTTPS (`SESSION_SECURE_COOKIE=true` when appropriate)

## Troubleshooting

If installation fails:

1. Confirm **PHP 8.3+** is active for both web and CLI (`php -v`)
2. Re-check required extensions on the installer requirements screen
3. Verify database host, name, user, and password
4. Ensure `storage` and `bootstrap/cache` are writable
5. Review `storage/logs/laravel.log`
6. Review installer-related logs if present under `storage/logs/`

For product support, open a request on the **[Deep42 Support Hub](https://hub.deep42.co/)**. Include your purchase code, PHP version, and relevant log excerpts.

## After install — how you sign in

| Path | Credentials |
|------|-------------|
| **Web installer** | Email + password you entered on **Create Admin** |
| **Manual `db:seed`** | Owner email `admin@deep42.co` with password `12345678` (change immediately on any public host) |

The web installer does **not** create demo buyers or fixed example.com accounts. Sign in with the owner credentials you set (or the seed owner above for manual installs only).

## Post-install checklist

1. Run a queue worker: `php artisan queue:work --tries=3` (Supervisor recommended)
2. Cron every minute: `* * * * * cd /path/to/krikkit && php artisan schedule:run >> /dev/null 2>&1`
3. Add at least one AI provider key (`ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / …)
4. Set `APP_URL` to your public HTTPS URL
5. Optional: bind license under **Settings → License**; configure GitHub, Supabase, Unsplash/Pixabay as needed
