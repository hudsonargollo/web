# Languages

Krikkit supports multiple locales. Admins add languages and edit translation strings without deploying code.

**Location:** Dashboard → **Admin** → **Languages**  
**URL:** `/dashboard/languages`  
**Permission:** `languages.view_any`

## Add a language

1. **Languages** → **Create**
2. Enter **code** (for example `en`, `tr`, `de`) and display name
3. Enable or disable the locale
4. Save

Set the platform default under [General & Branding](/docs/general-settings) → **Default language**.

## Translate files

1. Open a language → **Translate**
2. Pick a file group (for example `admin`, `messages`)
3. Edit key/value pairs in the UI
4. Save changes

Translations are stored on disk in `lang/{code}/`. Back up this folder before major edits.

## User-facing language switcher

Authenticated users can switch language from the dashboard header when multiple locales are active.

---
