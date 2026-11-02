# Stock Images

Lab looks up licensed photographs on the **server** and returns public image URLs to the agent. Visitors never see these keys.

**Ability:** `ai.revise`

| Catalog | Dashboard URL |
|---------|----------------|
| Unsplash | `/dashboard/integration/unsplash/edit` |
| Pixabay | `/dashboard/integration/pixabay/edit` |

Workspace values override `.env`. Enable the provider with the switch on the same screen.

## Unsplash

Unsplash’s developers dashboard lists **three** values. Paste all three. Photograph search uses the **Access Key**.

| Field | Unsplash label | Used for search? |
|-------|----------------|------------------|
| Application ID | Application ID | Stored only. Lab does not send it with searches. |
| Access Key | Access Key (Client-ID) | **Yes.** Sent as `Authorization: Client-ID {key}`. |
| Secret key | Secret key | Stored encrypted. OAuth only — Lab search does not use it. |

```env
UNSPLASH_APPLICATION_ID=
UNSPLASH_ACCESS_KEY=
UNSPLASH_SECRET_KEY=
```

Without a valid Access Key, `lookup_visuals` returns an empty list and the agent falls back to CSS or illustration instead of inventing photo URLs.

## Pixabay

One API key. Dashboard → API Integration → Pixabay, or `PIXABAY_API_KEY` in `.env`.

## In Lab

1. When a page needs real photos (hero, interior, product, team, food), the agent calls `lookup_visuals` **before** `write_file`.
2. Chat shows an image-icon tool card: **Looking up photographs** / **Looked up N photographs**. The scene query is not printed in the transcript.
3. The agent must use each returned `src` as an img src. It must not invent Unsplash or Pixabay IDs.

Related: [API Integration](/docs/integration), [Lab Integrations](/docs/lab-integrations).