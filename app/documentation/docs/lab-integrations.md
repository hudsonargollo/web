# Integrations

Configure platform keys under **Dashboard → API Integration**. Users connect accounts from the Lab Settings sheet or the Database / GitHub panels.

## Supabase

| Action | Where |
|--------|--------|
| OAuth connect | Integrations panel / Connect modal |
| Manual keys | Local or self-hosted projects |
| Disconnect | Same panel |
| Database tab | Schema, SQL, table rows |
| Migrations | Agent proposes SQL → user **Allow** or **Skip** |
| Tool | `survey_datastore` |

**Env:** `SUPABASE_OAUTH_*`.  
**Callback:** `{APP_URL}/lab/oauth/supabase/return`.

If Supabase is not connected and the user asks for auth or tables, the agent requests a connection instead of inventing credentials.

## GitHub

| Action | Where |
|--------|--------|
| Authorize account | Integrations / Import from GitHub |
| Import repo | Creates a new Krikkit project from a branch |
| Link project | Connect an existing project to a repo |
| Push / sync | Top bar Sync |
| Open PR | Top bar Open PR / View PR |
| Disconnect | Project GitHub panel |

**Env:** `GITHUB_OAUTH_*`.  
**Callback:** `{APP_URL}/lab/vcs/github/return`.

Requires a real queue worker (`QUEUE_CONNECTION=database` or Redis — **not** `sync`).

## Stock photographs

Operators enable Unsplash and/or Pixabay under **Dashboard → API Integration**. Lab uses them server-side via `lookup_visuals`.

Unsplash has three fields (Application ID, Access Key, Secret). Search uses the Access Key only — see [Stock Images](/docs/stock-images).

```env
UNSPLASH_APPLICATION_ID=
UNSPLASH_ACCESS_KEY=
UNSPLASH_SECRET_KEY=
PIXABAY_API_KEY=
```

## Web search & fetch

Used by chat tools:

- `SearchWeb` — DuckDuckGo default or Brave with API key
- `FetchFromWeb` — page text for research