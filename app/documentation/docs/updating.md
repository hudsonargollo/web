# Updating

## Safe upgrade path

1. Back up your database and `.env`
2. Upload changed files over your install (keep `.env`)
3. Run:

```bash
composer install --no-dev --optimize-autoloader
php artisan migrate
npm install && npm run build
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

<Callout>

Never run `migrate:fresh`, `db:wipe`, or `migrate:refresh` on a live site with customer data.

</Callout>

## License

After major updates, open **Dashboard → Settings → License** and recheck your purchase code if prompted.

## Queue worker

Optional unless you add custom queued jobs. Core Lab preview and publish flows do not require a worker.

---
