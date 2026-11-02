# Projects

**URLs:** `/projects`, `/starred`, `/projects/{project}/export`

Each **project** is a Lab workspace backed by a database record and on-disk files under `storage/app/lab/projects/{uuid}/`.

## Create a project

1. Open Studio (`/`) or go to `/lab`
2. Enter a brief describing the site you want
3. Krikkit creates the project, seeds the site kit, and opens the Lab IDE

## Project title

The title in the Lab top bar is a **product wordmark**, not a restatement of the prompt.

- A brief such as “make a 3 page website for a beauty salon” is **not** a name. The titler invents a short brand (Aurelia, Maison Luxe, Lumière).
- If the user already named the product, that name is kept.
- Greetings and small talk stay **Untitled**.
- Untitled is a placeholder. When a real product brief arrives, Lab retitles the project.

Operators do not configure this — it runs on the first Lab chat turn.

## Project list

| Action | Where |
|--------|-------|
| Browse all | `/projects` |
| Star / unstar | Project card menu in Studio |
| Resume in Lab | `/lab/{project}` |
| Export ZIP | `/projects/{project}/export` (requires entitlement) |

## Limits

Project counts and Lab credits depend on the user's **pack**. Operators configure limits under **Dashboard → Packs**.