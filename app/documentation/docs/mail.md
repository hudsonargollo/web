# Email (SMTP)

Krikkit does not include an admin UI for SMTP. Configure mail in your **`.env`** file (or hosting panel environment variables).

## Required variables

```env
MAIL_MAILER=smtp
MAIL_HOST=smtp.example.com
MAIL_PORT=587
MAIL_USERNAME=your-user
MAIL_PASSWORD=your-password
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=noreply@yourdomain.com
MAIL_FROM_NAME="${APP_NAME}"
```

## Common providers

| Provider | Notes |
|----------|--------|
| **Amazon SES** | Use SES SMTP credentials; verify domain in AWS |
| **Mailgun** | SMTP credentials from Mailgun dashboard |
| **Postmark** | Server token as password |
| **SendGrid** | API key or SMTP relay |
| **Gmail / Google Workspace** | App password; not ideal for production volume |

## Local development

Default `.env.example` often uses `MAIL_MAILER=log`, which writes messages to `storage/logs` instead of sending. Switch to SMTP or a tool like [Mailpit](https://github.com/axllent/mailpit) when testing registration and billing emails.

## After changing mail settings

```bash
php artisan config:clear
```

If you use config caching in production, rebuild cache after updating env:

```bash
php artisan config:cache
```

## What uses email

- User registration and password reset
- Billing and subscription notifications (when implemented in templates)
- System notifications from queued jobs

Test by registering a new user on staging with a real inbox.

---
