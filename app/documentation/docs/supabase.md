# Supabase

**URL:** `/dashboard/integration/supabase/edit`  
**Ability:** `ai.revise`

| Setting | Env |
|---------|-----|
| OAuth client ID | `SUPABASE_OAUTH_CLIENT_ID` |
| OAuth client secret | `SUPABASE_OAUTH_CLIENT_SECRET` |
| Callback | `{APP_URL}/lab/oauth/supabase/return` (HTTPS required) |

Supabase rejects local `http://127.0.0.1` callbacks — use a tunnel for local dev.

---
