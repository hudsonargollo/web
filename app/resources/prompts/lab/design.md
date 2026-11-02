# Design Language — Void Precision

> How every Lab site earns a “this looks shipped” reaction: typographic conviction, disciplined surfaces, one accent, purposeful motion.
> Each project carries a `visual_identity` in context (mode, palette, fonts, hero & nav recipe). **Implement that assignment on the first build** — it is this site’s starting look. User-stated brand, mode, or colors override it. **Brand pivot:** when the user replaces the product/industry entirely in the same project (salon → construction, SaaS → restaurant, portfolio → clinic), **rewrite `src/index.css` `@theme`** with fonts, accent, and soft tint that fit the **new** brief — do not reuse the previous site’s palette or font pairing unless they asked to keep the look. Craft is shared; the look is not.
> **White canvas by default:** `--color-canvas` and `body` background = `#ffffff` unless the user asked for another base (cream, gray, dark). Assigned identities are light and white-first.
> **Borderless modern chrome:** match Vercel / Linear / Resend / Clerk (2026) — one continuous white surface, depth from type scale + negative space + gradient light + subtle `bg-soft` fills. **Do not** wrap sections, cards, mocks, nav, or pricing in `border` / `divide-*` / boxed outlines unless the brief truly needs a table, terminal chrome, or form field — borders read as 2018 template.

---

## 1. The bar

Match the *level of finish* — never the brand, copy, or layout — of the best product sites shipping in **2026**: Vercel, Linear, Raycast, Resend, Clerk, Stripe, Arc. Not Bootstrap card grids, not “boxed landing page” templates. A visitor should believe a design team spent weeks on the page. That impression comes from six things you control on every build:

1. **A monumental artifact in the hero.** The product is visible in the first viewport at real scale: a full-width app screenshot bleeding below the fold, one iconic glowing object, a terminal, an inbox, a photograph, a typographic index. Size the artifact to dominate the viewport — full-width mocks, overflowing frames, monument objects at 18–24rem.
2. **Light as material — not wallpaper.** Shipped-class 2026 pages are **borderless**: white canvas, giant type, and **one** subtle lighting accent in the hero behind the product artifact. A flat white page holding bordered rectangles is the single biggest “old template” tell. Gradient blooms are **hero-only backdrop** — never the main content, never repeated in every section.
3. **Typographic conviction at scale.** The hero H1 runs 48–120px via the recipe’s `clamp()` — two lines maximum, tight leading (`leading-[0.98–1.05]`), tight tracking. A quieter deck under it, meta text that whispers (12–13px). Type scale and negative space do the visual work that decoration would otherwise fake.
4. **A complete page.** Header, 5–8 purposeful sections, and a real footer — all in the first build. Depth below the fold is what separates a product site from a template.
5. **Specific copy.** Named features, plausible numbers, real-sounding testimonials, concrete CTAs (“Start indexing”, “Book a table”, “View the collection”) written for THIS product.
6. **Motion that rewards scrolling.** Sections fade up as they enter, the hero animates in on load, interactive elements respond on hover. Calm, springy, 200–700ms.

**Anti-patterns (read as “old”):** bordered card grids, alternating gray section stripes, heavy `border-line` on every mock, outline buttons everywhere, drop shadows, cramped padding, small centered hero in a box.

**Anti-patterns (read as “AI poster”, not shipped):**
- **Glow-only hero** — display H1 + one paragraph + CTA floating on a full-viewport `radial-gradient` / `blur-3xl` blob with **no product mock, inbox UI, split artifact, or proof rail** in the first viewport. This is the #1 failure mode; reference [21st.dev SaaS landings](https://21st.dev/community/templates/s/landing-page): hero = headline **plus** dense product chrome (dashboard, inbox, bento mock) bleeding below the fold — not typography on empty color-field.
- **Bloom wallpaper** — repeating `radial-gradient`, `blur-2xl`, or color-field shapes behind **every** section (features, pricing, CTA). **Max one** hero backdrop layer for the whole page; below the fold use `bg-soft/40`, bento cells, splits, and real mocks — not another giant glow.
- **Empty viewport** — hero that is only centered type with `min-h-dvh justify-center` and no artifact bleeding into or below the fold. Even typographic heroes need a proof artifact (stats row, logo rail, overflowing app frame) **in the same section**.

**Quantity calibration (important):** a finished landing page is typically **8–12 components and 700–1500 lines of JSX** in total. Sections run 60–150 lines each because they contain real content — nav links, feature copy, stat numbers, footer columns. If a build lands under ~500 lines it will read as a starter template; add a real section or deepen the artifact, never padding.

**Write cadence (critical):** each `write_file` must be complete (balanced JSX — every tag, brace, and string closed). Write every file the page still needs — there is no per-turn file-count cap. **Always overwrite** `src/App.jsx` **in the same turn as the first sections** so Preview mounts Header/Hero immediately. Finish each file completely; if you are near the output limit, stop after the last balanced write rather than cutting mid-`className`.

`page_shape` **is the page architecture.** Implement the assigned `visual_identity.page_shape` — its named sections and layout grammar are the spine of the page. The JSX skeletons below are geometry hints for hero recipes; compose the full page from the assigned shape and the section menu in §2.

---



## 2. Page anatomy

For a marketing/landing brief (the default unless the user asked for an app shell), assemble the page from this menu. Pick 5–8 content sections that fit the brief; order flexes:


| Section                              | What makes it excellent                                                                                                                                                                                                                                      |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Header**                           | Product wordmark + 4–6 destinations that belong to THIS product + one primary CTA. Sticky with `backdrop-blur-md` + `bg-white/80` (or `bg-canvas/80`) — **no bottom border**. Nav links: `text-fg-muted` → `text-fg` on hover; active route = `text-fg` only. |
| **Hero**                             | The assigned `hero` recipe from `visual_identity`, filled with: eyebrow badge (optional), display H1 with a specific claim, one-sentence deck, ONE primary action (secondary is a text link with `→`), and the product artifact.                             |
| **Proof rail**                       | A quiet strip under the hero: 4–6 customer wordmarks as styled text (`text-fg-muted/60 font-medium tracking-wide`), or 3 stat numbers (`10k+ deploys · 99.99% uptime · 4ms p50`).                                                                            |
| **Feature bento**                    | An asymmetric grid (e.g. one 2-col cell + two 1-col cells) where each cell holds a mini-artifact: a mock UI fragment, a code line, a metric, a diagram made of divs — plus a title and one sentence.                                                         |
| **Feature story (alternating rows)** | 2–4 rows of text-beside-artifact, sides alternating. Each row = one large heading + 1–2 sentences + a DOMINANT distinct artifact (60–90% of the row is the mock, not the copy). Optionally number the story (`01 Intake →`, `02 Plan →`) in mono micro-type. |
| **Product deep-dive**                | One large screenshot-style mock with annotated callouts, a tabbed code editor (2–3 file tabs that switch content via state), or a code/preview split.                                                                                                        |
| **Testimonial**                      | One oversized quote with name/role/company, or a 2–3 card wall with avatar initials in colored circles.                                                                                                                                                      |
| **Pricing**                          | 2–3 tiers, one highlighted with a subtle `bg-soft` fill and a “Popular” badge — **not** a border ring; feature list with check icons; honest per-tier CTA.                                                                                                                                |
| **FAQ**                              | 4–6 real questions, native `<details>` or a state-toggled accordion.                                                                                                                                                                                         |
| **CTA band**                         | Full-width closing section: display-size invitation + one button. May invert (fg background, canvas text) or use a subtle accent bloom.                                                                                                                      |
| **Footer**                           | 3–5 link columns (Product / Company / Resources / Legal), wordmark, a one-line tagline, social icons, tiny legal row. Real link labels.                                                                                                                      |


Editorial briefs (restaurant, hotel, atelier, jewelry, portfolio) swap the SaaS modules for: full-bleed photography, an index-as-typography list (dish names + prices, pieces + materials, projects + years), an hours/location strip, an appointment or reservation CTA. Same completeness, same depth — cinema instead of density.

App/dashboard briefs get a usable chrome instead: sidebar or top nav, one primary view filled with realistic example data (8–15 rows, plausible names and values), working tab/filter state, and designed empty/loading states (icon + one honest line).

---



## 3. Section recipes



### Hero geometry (implement the assigned recipe; these are the skeletons)

Showcase — headline block, then ONE full-width product mock bleeding below the fold:

```jsx
<section className="relative overflow-hidden pt-24 lg:pt-32">
  <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(ellipse_at_top,color-mix(in_oklab,var(--color-accent)_14%,transparent),transparent_70%)]" />
  <div className="relative mx-auto max-w-6xl px-6">
    <h1 className="max-w-3xl font-display text-[clamp(3rem,7vw,6rem)] leading-[0.98] tracking-tight animate-fade-up">{claimLine1}<br />{claimLine2}</h1>
    <div className="mt-6 flex flex-wrap items-end justify-between gap-4 animate-fade-up [animation-delay:120ms]">
      <p className="max-w-md text-lg text-fg-muted">{oneSentenceDeck}</p>
      <a href="#new" className="text-sm font-medium text-fg-muted transition hover:text-fg"><span className="text-fg">New</span> — {featureName} →</a>
    </div>
    <div className="relative mt-16 animate-scale-in [animation-delay:200ms]">
      <div className="-mb-24 overflow-hidden rounded-2xl bg-soft/60 lg:-mb-40">
        {/* FULL app mock: sidebar + main pane + right rail, 15+ realistic rows — borderless, soft fill or inner bg-soft steps */}
      </div>
    </div>
  </div>
</section>
```

Monument — one iconic object with a backlight bloom (build the object from CSS: clip-path shape, layered divs, a glyph at 20rem, or a photo cutout):

```jsx
<section className="relative flex min-h-dvh items-center overflow-hidden px-6">
  <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 size-[44rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--color-fg)_26%,transparent),transparent_62%)] blur-2xl" />
  <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 lg:grid-cols-[1fr_auto_1fr]">
    <div className="animate-fade-up">
      <h1 className="font-display text-[clamp(2.75rem,5.5vw,5rem)] leading-[1.02] tracking-tight">{claim}</h1>
      <div className="mt-8 flex items-center gap-4">
        <Button size="lg">{primaryAction}</Button>
        <Button size="lg" variant="outline">{secondaryAction}</Button>
      </div>
    </div>
    <div className="animate-scale-in [animation-delay:150ms]">{/* the object, ~18–24rem */}</div>
    <ul className="space-y-3 text-sm text-fg-muted animate-fade-up [animation-delay:250ms]">{/* 3 whisper-size support lines */}</ul>
  </div>
  {/* optional: monochrome customer wordmark rail pinned to the viewport foot */}
</section>
```

Beacon — centered display type with a **faint** color-field behind the headline block, then a **full-width product mock** (or proof rail + mock) that dominates the lower half — never type-only on a giant blob:

```jsx
<section className="relative overflow-hidden pt-24 lg:pt-32">
  <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(ellipse_at_top,color-mix(in_oklab,var(--color-accent)_12%,transparent),transparent_70%)]" />
  <div className="relative mx-auto max-w-6xl px-6 text-center lg:text-left">
    <h1 className="mx-auto max-w-4xl font-display text-[clamp(3.5rem,9vw,7.5rem)] leading-[0.98] tracking-tight animate-fade-up lg:mx-0">{claim}</h1>
    <p className="mx-auto mt-6 max-w-xl text-lg text-fg-muted animate-fade-up [animation-delay:120ms] lg:mx-0">{deck}</p>
    <div className="mt-10 flex flex-wrap items-center justify-center gap-4 animate-fade-up [animation-delay:200ms] lg:justify-start">{/* primary + text link */}</div>
    <div className="relative mt-16 animate-scale-in [animation-delay:280ms]">
      <div className="-mb-24 overflow-hidden rounded-2xl bg-soft/60 lg:-mb-40">
        {/* REQUIRED: inbox / dashboard mock — sidebar + 12+ rows, or proof stats row directly above mock */}
      </div>
    </div>
  </div>
</section>
```

Full-bleed photographic (editorial briefs — `lookup_visuals` first):

```jsx
<section className="relative min-h-dvh">
  <img src={visual.src} alt={visual.alt} className="absolute inset-0 size-full object-cover" />
  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
  <div className="relative flex min-h-dvh flex-col justify-end px-8 pb-16 text-white">
    <h1 className="max-w-3xl font-display text-[clamp(3rem,9vw,7rem)] leading-none tracking-tight animate-fade-up">{claim}</h1>
    <a href="#reserve" className="mt-8 w-fit border-b border-white/40 pb-1 text-sm tracking-wide transition hover:border-white">{quietAction}</a>
  </div>
</section>
```

Type-led: the display headline owns the viewport (`text-[clamp(3.5rem,10vw,8rem)]`), with a proof artifact (stat row, ticker, or overflowing product frame) anchored beneath it — the type is the hero, the artifact is the evidence.

### Product artifact (mock chrome — the single highest-leverage element)

Build a believable product window out of divs. Give it: a title bar, realistic content rows, one highlighted element, and small touches (status dot, kbd hint, timestamp). Example shape:

```jsx
<div className="overflow-hidden rounded-2xl bg-soft/50">
  <div className="flex items-center gap-2 px-4 py-3">
    <span className="size-2.5 rounded-full bg-fg-muted/30" /><span className="size-2.5 rounded-full bg-fg-muted/30" /><span className="size-2.5 rounded-full bg-fg-muted/30" />
    <span className="ml-3 text-xs text-fg-muted">acme — deployments</span>
    <kbd className="ml-auto rounded-md bg-canvas px-1.5 py-0.5 text-[10px] text-fg-muted">⌘K</kbd>
  </div>
  <div className="space-y-px bg-canvas/40">
    {deployments.map((d) => (
      <div key={d.id} className="flex items-center gap-3 bg-canvas px-4 py-3 text-sm">
        <span className={`size-1.5 rounded-full ${d.ok ? 'bg-emerald-500' : 'bg-amber-500'}`} />
        <span className="font-medium">{d.name}</span>
        <span className="text-fg-muted">{d.branch}</span>
        <span className="ml-auto text-xs tabular-nums text-fg-muted">{d.time}</span>
      </div>
    ))}
  </div>
</div>
```

Vary the chrome to fit the brief: terminal (dark surface, `font-mono`, `$` prompt lines, one green success line), editor (line numbers, syntax-tinted spans), inbox (sender/subject/time rows), analytics (bars made of divs with heights, one accent bar), doc (headed paragraphs). Populate with 5–10 rows of plausible data defined in a `const` above the component.

### Feature bento

```jsx
<div className="grid gap-6 lg:grid-cols-3">
  <div className="rounded-2xl bg-soft/40 p-6 lg:col-span-2">{/* wide cell: mini-mock + title + line */}</div>
  <div className="rounded-2xl bg-soft/40 p-6">{/* metric or fragment */}</div>
</div>
```

Each cell leads with its artifact (mini-mock, big `tabular-nums` metric, icon-annotated diagram), then `h3` + one sentence. Cells differ from each other — that is what makes it a bento and not three clone cards.

### Section header pattern

Sections open with `h2` at real scale — `font-display text-4xl lg:text-5xl tracking-tight` (~80% of the hero, 36–56px) — then a 1–2 sentence sub in `text-fg-muted`, wrapped in `<Reveal>`. An eyebrow above it is optional; the shipped-class sites mostly skip it and let the heading carry. **Left-align headings on split sections; center headings only on full-width moments** (deep-dive, CTA band).

### Below the fold (where templates die)

The reference-class sites keep 60–90% of every below-fold section as *artifact* — product mock, code editor, table, chart, rendered output — with copy compressed to a heading and one or two sentences. Apply that ratio: if a section is mostly paragraphs and icon blurbs, replace the blurbs with a mock that *shows* the claim. Sections are separated by generous space (`py-24 lg:py-32`, more around deep-dives), **not** by borders, background tiles, alternating canvas stripes, or **another radial glow**. The page stays one continuous white surface; depth below the fold comes from mocks and `bg-soft/40` fills — **do not** paste the hero bloom behind every feature section. One signature interactive element per page earns "product, not template": a tabbed code editor, a state-switched feature toggle, an auto-scrolling logo/testimonial marquee, or a clickable tag cloud.

### Layout variety (what separates this from a template)

Give each section its own layout grammar. Alternate full-width centered moments with left/right splits; flip the artifact side between consecutive splits. When one section is a bento, the next is a monochrome logo strip or marquee; when pricing is three cards, the section before is a split or full-width band. **Feature sections lead with a product artifact** — bento cell, alternating story row, or deep-dive mock — with a title and one supporting line; vary the artifact type section to section. At least two sections besides the hero contain a chart, table, code block, or mock fragment. Logo and integration tiles stay monochrome (`text-fg-muted`, hover to `text-fg`) so the single accent reads on CTAs and key states.

### Mechanics (reliability)

- `<Reveal>` **renders the wrapper element.** In a grid, layout classes go on the Reveal itself: `<Reveal className="lg:col-span-2">…`. Put `col-span` / `row-span` on Reveal so the column actually spans.
- **Deterministic data.** Charts, stats, and rows come from a `const` array above the component — stable on every render.
- **Anchors clear the sticky header.** The CSS template ships `scroll-padding-top` on `html`; keep it so in-page nav lands below the header.
- **Live anchors only.** Every nav / CTA `href="#…"` resolves to a real `id` on a section of this page.

---



## 4. Type, space, color


| Role            | Treatment                                                                                               |
| --------------- | ------------------------------------------------------------------------------------------------------- |
| Hero H1         | `font-display`, 48–120px via the recipe’s clamp, max two lines, `tracking-tight`, `leading-[0.98–1.05]` |
| Section H2      | 36–56px (`text-4xl lg:text-5xl`, ~80% of hero), semibold, tight                                         |
| Deck / body     | 16–18px, `text-fg-muted`, `leading-relaxed`, max-w-prose                                                |
| Nav / meta      | 13–14px medium                                                                                          |
| Eyebrow / micro | 11–12px, uppercase, `tracking-[0.15em+]`                                                                |
| Numbers         | `tabular-nums`; stats can jump to display size                                                          |


**Faces:** wire `font_ui` / `font_display` / `font_import` from `visual_identity` **exactly** — the assigned pairing plus `type_voice` and `type_scale` IS this project's typographic personality. Identities span four voices (neutral grotesks, characterful display sans, wide statement faces, editorial serif pairs); implement all three axes. Serif display faces appear **only at display scale** (H1/H2, pull quotes) over the sans body; UI chrome and body copy stay in the sans UI face.

**Rhythm:** sections breathe with `py-24 lg:py-32` (hero and deep-dives more); content sits in `mx-auto max-w-6xl px-6` (prose sections `max-w-3xl`). Related elements 8–16px apart, groups 24–48px, sections 96–160px. Let type and whitespace carry structure — not boxes.

**Color ladder:** default **`--color-canvas: #ffffff`** and white `body` unless the user asked otherwise and it fits the brief. Surface steps = white → `soft` tint (`#f4f4f5` range) for mocks and bento cells — **not** bordered cards. Text: `fg` → `fg-muted` → `fg-muted/60`. **One accent**, spent deliberately: the primary CTA *or* a key word in the H1 *or* the active state. Status colors (emerald/amber/red) mark status only. **No dark mode** unless the user explicitly asked.

**Depth = product UI + space, not glow spam.** Implement the identity’s `atmosphere` **once**, in the hero, as a **single** subtle gradient layer **behind the product artifact** (10–18% tint, not a full-screen color wash). Separate regions with `py-*` spacing — never `border-t`, `divide-y`, alternating gray bands, or duplicate blooms in feature/pricing/CTA sections.

```jsx
{/* hero ONLY — one subtle spotlight behind the mock, not behind empty type */}
<div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(ellipse_at_top,color-mix(in_oklab,var(--color-accent)_14%,transparent),transparent_70%)]" />
```

Always `aria-hidden` + `pointer-events-none` + `overflow-hidden` on the hero section. **Do not** copy this layer into other sections — use `bg-soft/40` on bento cells and mocks instead. **Avoid structural borders.** Mocks use rounded-2xl + `bg-soft/40`; rows separate with spacing or 1px **internal** gaps only inside terminal/table chrome when the brief demands it. `rounded-*` follows the assigned radius consistently.

---



## 5. Motion

Motion is what separates “screenshot of a site” from “shipped product”. Budget per page: hero entrance + scroll reveals + hover states. Easing: `cubic-bezier(0.16,1,0.3,1)` (spring-out). Respect `prefers-reduced-motion` (the CSS template handles it globally).

1. **Hero entrance (on load):** stagger the hero children with `animate-fade-up` and `[animation-delay:100ms]` steps; the artifact gets `animate-scale-in`.
2. **Scroll reveals:** wrap each below-fold section in the kit’s `<Reveal>` (`src/components/ui/reveal.jsx` — if an older workspace lacks it, create it: IntersectionObserver at `threshold: 0.15`, sets opacity 0→1 and translateY(24px)→0 over 0.7s with the spring easing, honors reduced motion, `delay` prop in ms). Stagger siblings: `<Reveal delay={i * 90}>`.
3. **Hover micro-interactions:** every interactive element responds within 150–250ms — links shift color/opacity, soft fills brighten (`hover:bg-soft/80`), buttons brighten, arrows nudge (`group-hover:translate-x-0.5`). No border hover tricks.
4. **Ambient (optional, one per page):** logo marquee (`animate-marquee` on a duplicated row), slow accent bloom pulse, ticking metric.

---



## 6. Photography

When the brief is photographic (food, interiors, product, people, places): call `lookup_visuals` with a concrete English scene (“omakase counter low light”, “hand-hammered gold ring macro”) in its own round, then use the returned `visual.src` / `visual.alt` in the next round’s writes. Style images with intent: `object-cover` + fixed aspect, a hairline frame or overlay gradient when type sits on top. If no results return, ship a typographic index or product chrome instead. Only URLs returned by the tool go into `src`.

---



## 7. CSS (`src/index.css`)

First build rewrites `@theme` with this project’s `visual_identity` tokens — and keeps the animation layer:

```css
/* assigned font_import goes here, above tailwind */
@import 'tailwindcss';

@theme {
  --color-canvas: …;
  --color-surface: …;
  --color-soft: …;
  --color-fg: …;
  --color-fg-muted: …;
  --color-line: …;
  --color-accent: …;
  --font-sans: …;
  --font-display: …;
  --spacing: 0.25rem;
  --animate-fade-up: fade-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
  --animate-fade-in: fade-in 0.8s ease-out both;
  --animate-scale-in: scale-in 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
  --animate-marquee: marquee 40s linear infinite;
}

@keyframes fade-up { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: none; } }
@keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes scale-in { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: none; } }
@keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }

html { scroll-behavior: smooth; scroll-padding-top: 5rem; }
body { font-family: var(--font-sans); background: var(--color-canvas); color: var(--color-fg); }
::selection { background: var(--color-accent); color: #fff; }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
```

Tailwind v4 only: no `tailwind.config.*`; utilities read the `@theme` tokens (`bg-canvas`, `text-fg-muted`, `border-line`, `font-display`, `animate-fade-up`). Preflight is the reset.

---



## 8. Kit primitives

`src/components/ui/` ships `Button`, `Card`, `Input`, `Textarea`, `Label`, `Badge`, `Reveal` — each is both a named and a default export. Import either `import { Button } from './ui/button'` or `import Button from './ui/button'`. **`Button` supports `asChild`** — use `<Button asChild variant="primary"><Link to="…">Label</Link></Button>` for router links; never pass `asChild` to a raw `<button>`. Page sections you write yourself (`Hero`, `Pricing`…) must do the same: `export function Hero(){…}` plus `export default Hero`. Wire them in App.jsx with **default** imports (`import Hero from './components/Hero'`). `export default function Hero` is not a named export — `import { Hero }` crashes the preview.

### Multi-page routing (when the brief asks for /blog, /about, /services, etc.)

Use this architecture — do not improvise a second router or duplicate chrome.

**File layout**
- `src/pages/HomePage.jsx`, `ServicesPage.jsx`, … — one file per route target (compose sections only).
- `src/components/Header.jsx` + `Footer.jsx` — shared chrome, mounted **once** in `App.jsx`.
- Never import Header/Footer inside `src/pages/*` (duplicates nav, breaks active state).

**Router shell**
- Import `MemoryRouter`, `Routes`, `Route`, `Link`, `useLocation` from **`react-router-dom` only** — never create `src/components/MemoryRouter.jsx`.
- Wrap once in `src/main.jsx`:

```jsx
import { MemoryRouter } from 'react-router-dom'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <MemoryRouter
      initialEntries={[(() => {
        try {
          let p = window.location.pathname || '/'
          if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1)
          return p || '/'
        } catch { return '/' }
      })()]}
      initialIndex={0}
    >
      <App />
    </MemoryRouter>
  </StrictMode>,
)
```

- `App.jsx` holds `<Routes>` only — **never** wrap `<MemoryRouter>` inside App (Lab preview reads the URL path on load).

**Add a page (minimal diff)**
1. `write_file src/pages/BlogPage.jsx` (sections for that page).
2. Add `<Route path="/blog" element={<BlogPage />} />` in `App.jsx`.
3. Add `<Link to="/blog">` in Header desktop nav **and** mobile menu.
4. Do **not** rewrite `package.json` when `react-router-dom` is already listed.

**Active nav (required on desktop + mobile menu)**
- `const location = useLocation()` in Header.
- `const isActive = (path) => location.pathname === path` (exact match).
- Apply active classes to both desktop links and every item in the open mobile sheet.
- Mobile: `md:hidden` menu button + panel listing the same routes as desktop.

```jsx
const nav = [
  { to: '/', label: 'Home' },
  { to: '/services', label: 'Services' },
  { to: '/gallery', label: 'Gallery' },
  { to: '/contact', label: 'Contact' },
]
// map nav → <Link to={to} className={isActive(to) ? 'text-fg' : 'text-fg-muted'}>
```

Every `to` value MUST have a matching `<Route path="…">`. If a write_file fails (syntax), **retry that file in the same turn** before recap — do not leave one component behind.

---



## 9. In one line

**Implement this project’s** `visual_identity`**. Ship the complete page — real artifact, real copy, real depth, real motion — the first time.**

**Ship checklist:** white `#ffffff` canvas (unless user asked otherwise) · borderless Vercel-class layout · product-specific copy · hero artifact at real scale · assigned `atmosphere` gradient light · artifact-led sections below the fold · one accent hue · spacing + type for structure (not boxed cards) · photographs only from `lookup_visuals` URLs.