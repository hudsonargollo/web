# AI & Lab

## Failed to fetch in Lab chat

- Confirm a real provider API key under **Dashboard → API Integration**
- Set `AI_HTTP_DISABLE_PROXY=true` if a system proxy hangs outbound calls
- Check `storage/logs/laravel.log` for provider HTTP errors

## Preview blank or only a background colour

- Hard refresh the Lab tab
- Open browser DevTools → Console for DeepThought runtime errors
- The seed `src/App.jsx` is a blank canvas. Lab continues the turn until the first real sections are written into `App.jsx`. If a run stopped mid-page, send another message so the agent can finish assembling the layout.

## Photographs missing from generated sites

- Confirm Unsplash **Access Key** (not only Application ID) under **Dashboard → API Integration → Unsplash** — see [Stock Images](/docs/stock-images)
- Enable the Unsplash provider
- Chat should show an image-icon card (**Looking up photographs**). An empty result list means the agent should use CSS or illustration, not fake Unsplash URLs

## Project stays Untitled

Untitled is the placeholder for greetings and non-product messages. A real brief should mint a short invented brand, never a title-cased copy of the prompt. If a project was left Untitled, send another product brief in the same Lab — it will retitle.

## Credits exhausted

Adjust pack grants under **Dashboard → Packs** or grant credits under **Dashboard → Credits**.