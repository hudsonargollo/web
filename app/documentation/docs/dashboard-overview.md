# AI & Integrations Hub

**URL:** `/dashboard/settings/integration`

Overview table lists each provider, default model, and whether keys are configured. Open a provider to edit.

## AI providers

| Path | Provider |
|------|----------|
| `…/openai` | OpenAI |
| `…/anthropic` | Anthropic |
| `…/deepseek` | DeepSeek |
| `…/grok` | Grok (xAI) |
| `…/zhipu` | ZhipuAI |
| `…/google` | Google AI Studio |

Per provider you typically set: API key (encrypted), model, temperature, max output tokens, timeout, summarization tokens, plus a cost estimator where available.

**Env counterparts:** `OPENAI_*`, `ANTHROPIC_*`, `DEEPSEEK_*`, `GROK_*`, `ZHIPU_*`, `GOOGLE_AI_*`, `KRIKKIT_AI_DEFAULT`.

Admin values override `.env` when saved.

## Platform OAuth

| Path | Purpose |
|------|---------|
| `…/supabase` | Supabase OAuth client id/secret + callback help |
| `…/github` | GitHub OAuth client id/secret + callback help |

## Stock images

See [Stock Images](/docs/stock-images).

## Builder default model

After keys are saved, pick the platform default under [Lab Console](/docs/builder-settings).

---
