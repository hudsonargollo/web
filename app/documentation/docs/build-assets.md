# Build Assets

Krikkit ships a Laravel backend plus a Vite bundle for the public site, dashboard, auth screens, and the Lab React app.

## Production build

After install or deploy:

```bash
npm install
npm run build
```

Confirm `public/build/manifest.json` exists. Without it, pages load without CSS/JS.

## Local development

```bash
composer run dev
```

Runs Laravel, queue listener, logs, and Vite HMR together.

## Lab frontend

The Lab IDE lives under `resources/js/lab/`. Changes there require `npm run build` (or `npm run dev` during development) before production reflects updates.

## When to rebuild

- After pulling updates that touch `resources/js`, `resources/css`, or `vite.config.js`
- Before packaging for CodeCanyon or production deploy
- Not required for Markdown-only or PHP-only dashboard changes

---
