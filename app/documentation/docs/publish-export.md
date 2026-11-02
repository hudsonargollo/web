# Publish & Export

## Publish

Open **Publish** from the builder top bar (`PublishProjectModal`).

| Mode | Behavior |
|------|----------|
| **Subdomain** | Deploy to `{sub}.{publish_root}` — root from Application URL / `KRIKKIT_PUBLISH_SUBDOMAIN_ROOT` |
| **Custom domain** | Plan-gated; show CNAME instructions; verify DNS; attach host |

**API:** `GET …/workspace/publish/options`, `POST …/workspace/publish`  
Published traffic is served via host routing (`routes/published.php`).

Plan limits (subdomains / custom domains) come from Packs.

## Share links

Each project can expose an unauthenticated preview:

```
/share/{shareCode}/…
```

Share menu: copy link, share to X / LinkedIn, copy for Instagram. Also copy the published URL when live.

## Export ZIP

Download a successful build:

```
GET /projects/{projectUuid}/builds/{buildUuid}/export
```

Artifacts under `storage/app/exports` (retention: `KRIKKIT_EXPORT_RETENTION_DAYS`).

## Thumbnails

Preview capture uploads to `POST …/workspace/thumbnail` for project cards (`KRIKKIT_THUMBNAILS_*`).

## Operator checklist

- HTTPS `APP_URL` / Application URL correct before publish
- Queue workers running for builds and publish jobs
- DNS aligned for custom domains and subdomain root

---
