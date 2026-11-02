# Workspace

Inside `/lab/{projectUuid}`, the **workspace** is everything beside chat: preview, code, database, terminal, and visual inspect tools.

The view toolbar switches:

| Tab | Purpose |
|-----|---------|
| **Preview** | Live app iframe + address bar + viewport |
| **Code** | File tree + CodeMirror editor |
| **Database** | Supabase schema, SQL, rows (when connected) |

---

## Preview

### In-browser preview (default)

Krikkit compiles the project in the browser with an **DeepThought browser runtime** runtime (virtual filesystem, npm resolution, Vite/Next shims). Users iterate without Docker. The page is served under cross-origin isolation so SharedArrayBuffer / WASM work.

### Server-side Vite preview (`/preview-dev`)

For heavier apps, Krikkit can start a **server Vite** process per project and proxy it at:

```
/preview-dev/{projectUuid}/
```

| Control | API |
|---------|-----|
| Start | `POST …/dev-preview/start` |
| Stop | `POST …/dev-preview/stop` |
| Status | `GET …/dev-preview/status` |
| Logs | `GET …/dev-preview/logs` |

**Requirements:** Node **20.19+**, npm **10+**, `proc_open` enabled.  
**Config:** `KRIKKIT_DEV_PREVIEW_*`, port range default `15000–15999` (`config/krikkit.php` → `dev_preview`).

### Address bar & navigation

- Shows the current preview path (normalized)
- Enter a path and press Enter to navigate inside the iframe
- **Back / Forward** — iframe history
- **Reload** — hard refresh (`builder-reload-preview`)
- **Open external** — shareable preview URL in a new tab
- Fullscreen and zoom/framed device chrome on non-desktop viewports

### Viewport modes

Cycle **desktop → tablet → phone** from the responsive toolbar. Non-desktop modes wrap the iframe in device framing.

### Runtime sessions

Signed sandbox tokens: `POST …/runtime/sessions`, token refresh, and remote fallback when configured (`BUILDER_REMOTE_RUNTIME_*`, DeepThought keys).

---

## Inspect mode & visual design edits

1. Switch to **Preview**
2. Enable **Inspect** in the top bar
3. Click an element in the iframe
4. The **Inspector** opens (dock left or right); optional floating design chat appears
5. Tweak CSS live, or send a design prompt (+ optional screenshot) to the AI

**Screenshot upload:** `POST …/design-edit/screenshot`  
**Prompt chips (examples):** `/modern`, `/contrast`, `/spacious`, `/simplify`, `/readable`, `/shadows`, `/pop`, `/hierarchy`

Design edits package the selected element path, CSS delta, and screenshot for the agent session.

---

## Inspector (what you can edit)

| Section | Properties |
|---------|------------|
| **Typography** | font family, size, weight, style, line height, letter spacing, align, transform, decoration |
| **Color** | text `color` |
| **Background** | `backgroundColor` |
| **Layout** | display (block/flex/grid/…), margin, padding (per side) |
| **Border** | color, style, width |
| **Shadow** | presets XS→2XL or custom X/Y/blur/spread/color/inset → `boxShadow` |
| **Appearance** | opacity, border radius (including per-corner) |

Pending styles preview live; **Apply** sends them into the AI edit pipeline.

---

## Code editor & file tree

| Feature | Detail |
|---------|--------|
| Tree | Hierarchical file browser |
| Search | Indexed path/content search |
| Editor | CodeMirror (light/dark themes); Cmd/Ctrl+S save |
| Tabs | Multi-file; unsaved close confirm; AI write conflict reload |
| Images | Inline preview for image assets |
| Bridge | Chat “open file” cards jump to the editor |

**API:** list/read/write files, file index, snapshot, sync, artifact upload.  
**Limits:** `KRIKKIT_WORKSPACE_MAX_FILE_SIZE`, `KRIKKIT_WORKSPACE_MAX_TOTAL_BYTES`, `KRIKKIT_ALLOW_MANIFEST_EDITS` (blocks `package.json` / lockfile edits by default).

---

## Terminal

Bottom **Terminal** panel:

- Run sandbox commands (`npm install`, `npm run build`, …) via `POST …/workspace/terminal/execute`
- Timeout: `KRIKKIT_WORKSPACE_TERMINAL_TIMEOUT` (default 180s)
- Audience: `BUILDER_TERMINAL_AUDIENCE=owner|technical`
- Multi-session tabs, interrupt, minimize
- During **auto-fix**, raw logs can stay collapsed until expanded
- Dev-preview logs can poll into the panel

---

## Database panel

When Supabase is connected (see [Integrations](/docs/lab-integrations)):

- **Table** view — browse rows
- **SQL** — run queries
- Schema refresh, migrations, chat **Allow / Skip** migration cards

---

## Builds, auto-fix, thumbnails

- Build sessions: start / status / cancel under `…/builds`
- After AI edits, the client can run build + **auto-fix** loops (background-fix stream)
- Thumbnails: capture from preview → `POST …/workspace/thumbnail` (`KRIKKIT_THUMBNAILS_*`)

## Security notes

- Manifest protection unless `KRIKKIT_ALLOW_MANIFEST_EDITS=true`
- Concurrent builds capped per user
- Prefer isolated workers for multi-tenant production

---
