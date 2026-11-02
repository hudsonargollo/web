# AI Chat

Chat is the primary way users build. The agent streams replies, runs tools, writes files, and looks up photographs before placing them in the layout.

## Composer

- Multi-line prompt input
- **Attachments** — images for vision-capable models
- **Model selector** — when Admin → Lab Console allows model selection
- Send starts (or continues) an agent session

## Streaming UI

| Element | Meaning |
|---------|---------|
| **Thinking** | Collapsible thought block |
| **Tool cards** | Active / complete labels for each tool |
| **Photograph card** | Image icon. **Looking up photographs** / **Looked up N photographs**. The scene query is not shown in the transcript. |
| **File write cards** | Complete files applied to the workspace |
| **Credits** | Balance; insufficient → upgrade drawer |

**Stream:** `GET …/chat/stream/{messageId}` (SSE).  
**Cancel:** session cancel endpoint.

## Agent tools

Schemas are defined in `LabToolCatalog`. Names used at runtime include:

| Tool | What it does |
|------|----------------|
| `list_dir` / `file_search` / `grep` / `read_file` | Inspect the working VFS |
| `write_file` | Atomic full-file overwrite. Body must be complete and balanced. There is **no** per-turn file-count cap. Always overwrite `src/App.jsx` in the same turn as the first sections so Preview is not the seed canvas. |
| `lookup_visuals` | Fetch licensed stock photographs. Call in its own round **before** `write_file` when a page needs real photos. Use each returned `src`. Never invent Unsplash/Pixabay IDs. |
| `survey_datastore` | Inspect Supabase connection and schema before inventing tables |

If the first turn only writes CSS and section files, Lab continues automatically until `src/App.jsx` imports those sections.

## Photographs

Operators configure Unsplash / Pixabay under [Stock Images](/docs/stock-images). Search uses the Unsplash **Access Key**. Empty lookup results → CSS or illustration, not fake photo URLs.

## Project titles

The first product brief mints a short invented wordmark (see [Projects](/docs/projects)). The chat prompt is never used as the title.

## Limits (operators)

| Env / config | Role |
|--------------|------|
| Pack credit grants | Metering |
| Model max output | Tokens per Lab turn (executor uses the model ceiling) |