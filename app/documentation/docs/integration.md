# API Integration

**URL:** `/dashboard/integration`  
**Ability:** `ai.revise`

Overview lists each provider, default model, and whether keys are configured. Open a provider to edit (`/dashboard/integration/{provider}/edit`).

## AI providers

| Slug | Provider |
|------|----------|
| `anthropic` | Claude |
| `openai` | OpenAI |
| `xai` | xAI |
| `deepseek` | DeepSeek |
| `groq` | Groq |
| `mistral` | Mistral |
| `zhipuai` | ZhipuAI |
| `google` | Google AI Studio |

Per provider: enable toggle, API key, model checklist, cost estimator. Dashboard values override `.env`.

**Default model env:** `AI_DEFAULT_MODEL`

## Platform OAuth

| Provider | Callback |
|----------|----------|
| GitHub | `{APP_URL}/lab/vcs/github/return` |
| Supabase | `{APP_URL}/lab/oauth/supabase/return` |

## Stock photographs

Unsplash and Pixabay power Lab’s `lookup_visuals` tool.

| Provider | Fields |
|----------|--------|
| Unsplash | Application ID, Access Key, Secret key |
| Pixabay | API key |

Unsplash photograph search uses the **Access Key** (`Authorization: Client-ID`). Application ID is stored for reference; Secret is OAuth-only. Full setup: [Stock Images](/docs/stock-images).