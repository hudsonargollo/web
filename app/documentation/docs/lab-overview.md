# Lab Overview

The **Lab** is Krikkit’s full AI studio. Users describe a product in chat; the agent edits a real workspace; they preview, inspect, refine, connect backends, and publish.

**URLs**

- `/lab` — create / resume
- `/lab/{projectUuid}` — open a project (cross-origin isolated for WASM preview)
- `/lab` — create flow
- `/lab` — template gallery
- `/projects` — project manager

## Studio layout

| Region | What it does |
|--------|----------------|
| **Left — Chat** | Prompt composer, streaming replies, thinking blocks, tool cards, attachments, clarifications, project tasks |
| **Centre / right — Preview chrome** | Preview · Code · Database tabs, address bar, viewport, reload, open external |
| **Top bar** | Home, project title, view toolbar, share, publish, sync/PR (GitHub), inspect toggle, settings |
| **Bottom — Terminal** (optional) | Workspace shell output, auto-fix status |
| **Inspector** (when inspecting) | Typography, color, layout, border, shadow, appearance |

## End-to-end flow

1. Create a blank project or start from a [Studio](/docs/studio-overview)
2. Send a plain-English goal in [AI Chat](/docs/chat)
3. Watch tools run (search, read, write, InspectSite, Supabase, todos…)
4. Use [Preview](/docs/workspace#preview) — in-browser WASM and/or server Vite
5. Toggle **Inspect** → click UI → adjust styles or ask for design edits
6. Connect [Supabase / GitHub](/docs/lab-integrations) when needed
7. [Publish](/docs/publish-export-export), share, or export a ZIP

## Credits and plans

AI usage consumes **credits**. Insufficient balance opens the upgrade drawer. Operators configure models and limits under Admin → Integrations and Packs.

## Related pages

- [Workspace (preview, code, inspect, terminal)](/docs/workspace)
- [AI Chat & agent tools](/docs/chat)
- [Templates](/docs/templates)
- [Integrations](/docs/lab-integrations)
- [Publish & Export](/docs/publish-export-export)
- [Billing](/docs/billing)

---
