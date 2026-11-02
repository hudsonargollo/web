# Privacy & Legal

Enable legal pages and edit content per language.

**Location:** Dashboard → **Admin** → **Settings** → **Privacy & terms**  
**URL:** `/dashboard/settings/privacy`

## Toggles

| Option | Effect |
|--------|--------|
| **Enable privacy policy page** | Serves `/privacy` when content exists |
| **Enable terms page** | Serves `/terms` when content exists |
| **Enable refund policy page** | Serves `/refund` when content exists |
| **Enable license agreement page** | Serves `/license` when content exists |
| **Show links on login page** | Displays links below the sign-in form for every enabled document |

## Content per language

1. Select **language** from the dropdown for each document
2. Edit **Privacy policy**, **Terms of service**, **Refund policy**, and **License agreement** rich text
3. Save

Repeat for each active locale. Empty content for a language hides that locale’s page even when enabled. Saving content for a document automatically enables its public page.

## Public URLs

| Document | Path |
|----------|------|
| Privacy policy | `/privacy` |
| Terms of service | `/terms` |
| Refund policy | `/refund` |
| License agreement | `/license` |

Each enabled document shows its **permalink** in the admin form. Published pages also appear in the landing footer (labels are editable under [Frontend Sections](/docs/frontend-sections)).

## Related

Custom legal or info pages can also be created under [Pages](/docs/pages) if you need URLs beyond these four routes.

---
