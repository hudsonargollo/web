# Common Issues

## Installer redirects or 500

1. Confirm PHP **8.3+** for web and CLI
2. Check writable paths: `storage/*`, `bootstrap/cache`
3. Review `storage/logs/laravel.log`

## Blank styles after deploy

Run `npm install && npm run build` and ensure `public/build/manifest.json` exists.

## Cannot log in after install

Verify `SESSION_DRIVER=database` and sessions table migrated. Clear browser cookies.

## License errors

Re-bind purchase code under **Dashboard → Settings → License**. Confirm outbound HTTPS to `deep42.co`.

---
