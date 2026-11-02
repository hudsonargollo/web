# Publish

## Subdomain does not resolve

- Wildcard DNS: `*.{APP_URL host}` → server
- Confirm **Dashboard → Settings → Publish** shows the expected parent domain

## Custom domain stuck on pending

- Add TXT record: `_krikkit-lab.{host}` = `krikkit={token}` from the Lab publish panel
- CNAME custom host to your `APP_URL` host

## Artifact upload fails

- Default max 50MB / 5000 files — tune `LAB_PUBLISH_ARTIFACT_MAX_BYTES`
- Run production build in Lab before uploading artifact

---
