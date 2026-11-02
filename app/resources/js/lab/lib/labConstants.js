/**
 * Empty-Lab suggestion chips.
 * `title` shows on the chip; `prompt` is inserted into the composer on click.
 * `icon` maps to Lucide glyphs via SeedIcon.
 * Seeds with `customize` open a form first so the generated app uses the user's details.
 */
const SEED_ACCENTS = [
    { value: 'teal', label: 'Teal' },
    { value: 'blue', label: 'Blue' },
    { value: 'violet', label: 'Violet' },
    { value: 'rose', label: 'Rose' },
    { value: 'amber', label: 'Amber' },
]

const CUSTOMIZE_HINT = 'Also include an in-app Customize panel (name, accent, and the lists below) that persists to localStorage so the user can keep editing after the first build. Starter content must use the details given here — not generic placeholders.'

export const SEEDS = [
    {
        title: 'Quiz App',
        icon: 'quiz',
        prompt: 'Create an interactive quiz application with multiple choice questions. Include a progress bar, timer, score tracking, instant feedback for answers, and a results page showing correct/incorrect answers. Add the ability to restart the quiz.',
    },
    {
        title: 'Email Template',
        icon: 'mail',
        prompt: 'Design a polished transactional email template for a SaaS product. Include a clear header with logo placeholder, primary message block, a single strong CTA button, secondary links, and a minimal footer with unsubscribe. Make it responsive and easy to customize.',
    },
    {
        title: 'SaaS Landing',
        icon: 'rocket',
        prompt: 'Build a modern SaaS landing page for a developer analytics tool. Include a bold hero with CTA, logo cloud, feature grid, pricing section, testimonials, and a final CTA. Keep typography expressive and the first viewport focused.',
    },
    {
        title: 'Portfolio',
        icon: 'briefcase',
        prompt: 'Create a clean portfolio site for a product designer. Include a strong personal intro, selected case studies with cover images, about section, and a simple contact CTA. Emphasize whitespace, typography, and project storytelling.',
    },
    {
        title: 'Waitlist Page',
        icon: 'sparkles',
        prompt: 'Build a waitlist landing page for an AI writing assistant. Include a compelling hero, email capture form with success state, social proof, three benefit points, and a FAQ. Keep the layout focused and conversion-oriented.',
    },
    {
        title: 'Dashboard',
        icon: 'chart',
        prompt: 'Create an admin analytics dashboard with KPI cards, a revenue line chart, traffic breakdown, recent activity table, and a sidebar navigation. Support light/dark friendly tokens and a responsive layout.',
    },
    {
        title: 'Kanban Board',
        icon: 'columns',
        prompt: 'Build a Kanban task board with columns for To Do, In Progress, and Done. Cards should show title, assignee, and priority. Include add-card actions and a clean project header. Make the board scroll horizontally on smaller screens.',
    },
    {
        title: 'Pricing Page',
        icon: 'tag',
        prompt: 'Design a SaaS pricing page with three plans, monthly/yearly toggle, feature comparison, highlighted recommended plan, and a FAQ. Make CTAs clear and the hierarchy easy to scan.',
    },
    {
        title: 'Docs Site',
        icon: 'book',
        prompt: 'Create a documentation homepage for a developer API. Include a search-friendly header, quickstart cards, sidebar navigation, code sample preview, and links to guides and API reference.',
    },
    {
        title: 'Blog Home',
        icon: 'file',
        prompt: 'Build a blog homepage with a featured article, category chips, a grid of recent posts with cover images and reading time, and a simple newsletter signup strip.',
    },
    {
        title: 'E-commerce',
        icon: 'bag',
        prompt: 'Create a product listing page for a boutique apparel store. Include filters, a product grid with image hover state, price and rating, and a sticky mini-cart summary. Keep the aesthetic premium and minimal.',
    },
    {
        title: 'Checkout',
        icon: 'card',
        prompt: 'Build a multi-step checkout flow with shipping details, payment form, order summary, and confirmation state. Show progress steps and validate required fields with clear error messages.',
    },
    {
        title: 'Calendar',
        icon: 'calendar',
        prompt: 'Create a month-view calendar app for scheduling events. Include day cells, event chips, an add-event modal with title/time, and a selected-day detail panel. Keep interactions snappy and readable.',
    },
    {
        title: 'Chat UI',
        icon: 'chat',
        prompt: 'Design a messaging interface with a conversation list, active chat thread, message bubbles, composer with send button, and online status indicators. Support empty and loading states.',
    },
    {
        title: 'Music Player',
        icon: 'music',
        prompt: 'Build a music player UI with album art, track title/artist, play/pause controls, progress scrubber, volume, and a queue list. Make the layout feel like a modern desktop player.',
    },
    {
        id: 'habit-tracker',
        title: 'Habit Tracker',
        icon: 'check',
        prompt: 'Create a habit tracker with daily checkboxes, streak counters, weekly heatmap, and the ability to add or archive habits. Show encouraging empty states and clear progress feedback. Include a Customize panel for name, accent, and habits, persisted to localStorage.',
        customize: {
            copy: 'Name the tracker and list the habits you want to keep.',
            fields: [
                { key: 'name', label: 'Name', type: 'text', placeholder: 'Morning stack', default: 'Morning stack' },
                { key: 'habits', label: 'Habits', type: 'textarea', placeholder: 'One per line', default: 'Meditate\nWalk\nRead' },
                { key: 'accent', label: 'Accent', type: 'select', options: SEED_ACCENTS, default: 'teal' },
            ],
        },
    },
    {
        id: 'invoice',
        title: 'Invoice',
        icon: 'receipt',
        prompt: 'Design a clean invoice page with company details, client info, line items table, subtotal/tax/total, payment status badge, and a download/print action. Make it look professional for clients. Include a Customize panel for company, client, tax, and line items, persisted to localStorage.',
        customize: {
            copy: 'Fill in who is billing whom, then the line items.',
            fields: [
                { key: 'company', label: 'From', type: 'text', placeholder: 'North Studio', default: 'North Studio' },
                { key: 'client', label: 'Bill to', type: 'text', placeholder: 'Acme Co', default: 'Acme Co' },
                {
                    key: 'currency',
                    label: 'Currency',
                    type: 'select',
                    options: [
                        { value: 'USD', label: 'USD' },
                        { value: 'EUR', label: 'EUR' },
                        { value: 'GBP', label: 'GBP' },
                        { value: 'TRY', label: 'TRY' },
                    ],
                    default: 'USD',
                },
                { key: 'items', label: 'Line items', type: 'textarea', placeholder: 'Brand design — 2400', default: 'Brand design — 2400\nWeb build — 4800' },
                { key: 'accent', label: 'Accent', type: 'select', options: SEED_ACCENTS, default: 'blue' },
            ],
        },
    },
    {
        title: 'CRM Contacts',
        icon: 'users',
        prompt: 'Build a CRM contacts directory with search, status filters, a contacts table, and a detail drawer showing email, company, and recent notes. Include an add-contact button.',
    },
    {
        title: 'Settings',
        icon: 'settings',
        prompt: 'Create an account settings page with profile fields, notification toggles, password change, and danger zone for deleting the account. Use clear sections and save affordances.',
    },
    {
        title: 'Onboarding',
        icon: 'steps',
        prompt: 'Build a 3-step product onboarding flow: welcome, workspace setup, and invite teammates. Include progress indicator, skip/next actions, and a finished state that routes into the app.',
    },
    {
        title: 'Login Page',
        icon: 'lock',
        prompt: 'Design a polished login page with email/password fields, remember me, forgot password link, social login options, and a brand panel or illustration. Keep focus on clarity and trust.',
    },
    {
        title: 'Weather',
        icon: 'cloud',
        prompt: 'Create a weather dashboard showing current conditions, hourly forecast, 7-day outlook, and location search. Use clear visual hierarchy for temperature and condition icons.',
    },
    {
        title: 'Recipe App',
        icon: 'utensils',
        prompt: 'Build a recipe browsing app with search, category chips, recipe cards, and a detail view with ingredients, steps, cook time, and servings. Include a save/favorite action.',
    },
    {
        title: 'Fitness Log',
        icon: 'activity',
        prompt: 'Create a workout logging interface with today’s plan, exercise sets/reps inputs, rest timer, and a weekly progress summary. Make it easy to complete a session quickly.',
    },
    {
        title: 'Travel Planner',
        icon: 'globe',
        prompt: 'Build a travel itinerary page with trip header, day-by-day schedule, map placeholder, packing checklist, and budget summary. Keep it visually inspiring and organized.',
    },
    {
        title: 'Job Board',
        icon: 'briefcase',
        prompt: 'Create a job board listing page with search, filters for role/location/type, job cards, and a detail panel with description and apply CTA. Emphasize scannability.',
    },
    {
        title: 'Event Page',
        icon: 'ticket',
        prompt: 'Design an event landing page with hero image, date/location, agenda, speaker cards, ticket CTA, and FAQ. Make the first viewport conversion-focused.',
    },
    {
        title: 'Photo Gallery',
        icon: 'image',
        prompt: 'Build a responsive photo gallery with masonry-style grid, lightbox viewer, captions, and category filters. Keep transitions smooth and the chrome minimal.',
    },
    {
        title: 'Notes App',
        icon: 'edit',
        prompt: 'Create a notes app with a sidebar list, note editor, tags, search, and pinned notes. Support empty state and autosave feedback in the header.',
    },
    {
        title: 'Pomodoro',
        icon: 'timer',
        prompt: 'Build a Pomodoro focus timer with start/pause/reset, work/break modes, session counter, and a simple task list for the current focus block.',
    },
    {
        title: 'Poll Maker',
        icon: 'bar',
        prompt: 'Create a live poll interface where users can vote on options and see results update as percentages and bars. Include create-poll form and shareable results view.',
    },
    {
        id: 'link-in-bio',
        title: 'Link in Bio',
        icon: 'link',
        prompt: 'Design a link-in-bio page with avatar, short bio, social icons, and a vertical stack of link buttons. Make it mobile-first and easy to brand. Include a Customize panel for name, bio, accent, and links, persisted to localStorage.',
        customize: {
            copy: 'Your name, a one-liner, and the links you want on the page.',
            fields: [
                { key: 'name', label: 'Name', type: 'text', placeholder: 'Jordan Lee', default: 'Jordan Lee' },
                { key: 'bio', label: 'Bio', type: 'text', placeholder: 'Designer & builder', default: 'Designer & builder' },
                { key: 'links', label: 'Links', type: 'textarea', placeholder: 'Portfolio — https://example.com', default: 'Portfolio — https://example.com\nNewsletter — https://example.com/list' },
                { key: 'accent', label: 'Accent', type: 'select', options: SEED_ACCENTS, default: 'rose' },
            ],
        },
    },
    {
        title: 'Changelog',
        icon: 'list',
        prompt: 'Build a product changelog page with version entries, date stamps, New/Improved/Fixed badges, and a subscribe CTA. Keep the timeline easy to scan.',
    },
    {
        title: 'Status Page',
        icon: 'pulse',
        prompt: 'Create a system status page showing overall health, component statuses, uptime percentages, and a recent incidents timeline with updates.',
    },
    {
        title: 'File Manager',
        icon: 'folder',
        prompt: 'Build a file manager UI with folders/files grid, breadcrumbs, upload button, selection states, and a details sidebar for the selected item.',
    },
    {
        title: 'Map Explorer',
        icon: 'map',
        prompt: 'Create a location explorer with a map panel, search, place cards, and a selected-place detail drawer with hours and directions CTA. Use placeholder map chrome.',
    },
    {
        title: 'Newsletter',
        icon: 'mail',
        prompt: 'Design a newsletter signup landing page with a strong headline, benefit bullets, email form, privacy note, and a sample issue preview card.',
    },
    {
        title: 'Survey Form',
        icon: 'form',
        prompt: 'Build a multi-step survey form with progress indicator, required validation, single/multi choice questions, and a thank-you completion screen.',
    },
    {
        title: 'Crypto Wallet',
        icon: 'wallet',
        prompt: 'Create a crypto wallet dashboard with total balance, asset list, send/receive actions, recent transactions, and a simple portfolio allocation chart.',
    },
    {
        title: 'Restaurant Menu',
        icon: 'utensils',
        prompt: 'Design a restaurant menu site with categories, dish cards, dietary tags, prices, and an order/reserve CTA. Make it appetizing and easy to browse on mobile.',
    },
    {
        title: 'Agency Site',
        icon: 'sparkles',
        prompt: 'Build a creative agency marketing site with a bold hero, selected work grid, services, process steps, and contact CTA. Prioritize brand presence over clutter.',
    },
    {
        title: 'Support Center',
        icon: 'life',
        prompt: 'Create a help center homepage with search, popular articles, category cards, and a contact support CTA. Include a sample article layout link target.',
    },
    {
        id: 'team-directory',
        title: 'Team Directory',
        icon: 'users',
        prompt: 'Build an internal team directory with search, department filters, member cards with role/avatar, and a profile modal with contact details. Include a Customize panel for org name, accent, departments, and people, persisted to localStorage.',
        customize: {
            copy: 'Name the org, then list departments and people.',
            fields: [
                { key: 'org', label: 'Organization', type: 'text', placeholder: 'Atlas Labs', default: 'Atlas Labs' },
                { key: 'departments', label: 'Departments', type: 'text', placeholder: 'Engineering, Design, Ops', default: 'Engineering, Design, Ops' },
                { key: 'people', label: 'People', type: 'textarea', placeholder: 'Ada Lovelace — Staff Engineer — Engineering', default: 'Ada Lovelace — Staff Engineer — Engineering\nMaya Chen — Product Designer — Design\nOmar Ruiz — Ops Lead — Ops' },
                { key: 'accent', label: 'Accent', type: 'select', options: SEED_ACCENTS, default: 'violet' },
            ],
        },
    },
    {
        title: 'Booking UI',
        icon: 'calendar',
        prompt: 'Create an appointment booking interface with service selection, date picker, time slots, customer details form, and confirmation summary.',
    },
    {
        title: 'Code Playground',
        icon: 'code',
        prompt: 'Build a mini code playground with an editor panel, preview pane, run button, and example snippets. Keep the layout split and developer-friendly.',
    },
    {
        title: 'AI Chat',
        icon: 'sparkles',
        prompt: 'Design an AI chat workspace with prompt suggestions, streaming-style message area, model selector, and a composer with attach/send controls.',
    },
    {
        title: 'Expense Tracker',
        icon: 'wallet',
        prompt: 'Create an expense tracker with add-expense form, category breakdown chart, monthly total, and a filterable transactions list.',
    },
    {
        title: 'Course Page',
        icon: 'book',
        prompt: 'Build an online course landing page with syllabus outline, instructor bio, lesson preview list, pricing, and enroll CTA.',
    },
    {
        title: 'Marketplace',
        icon: 'store',
        prompt: 'Create a freelance marketplace browse page with service cards, ratings, starting prices, skill tags, and search/filters for category and budget.',
    },
    {
        title: 'NFT Gallery',
        icon: 'image',
        prompt: 'Design an NFT collection gallery with hero drop info, item grid, rarity filters, and an item detail modal with owner and bid CTA.',
    },
]

export function seedIsCustomizable(seed) {
    return Array.isArray(seed?.customize?.fields) && seed.customize.fields.length > 0
}

export function defaultSeedValues(seed) {
    const values = {}
    for (const field of seed?.customize?.fields ?? []) {
        values[field.key] = field.default ?? ''
    }
    return values
}

function filled(value, fallback) {
    const text = String(value ?? '').trim()
    return text !== '' ? text : String(fallback ?? '').trim()
}

function asList(value, fallback) {
    const lines = filled(value, fallback)
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)

    return lines.length > 0 ? lines.join('\n') : filled(fallback, '')
}

/**
 * Compose a tailored first prompt from a customizable seed + form values.
 */
export function buildCustomSeedPrompt(seed, values = {}) {
    const defaults = defaultSeedValues(seed)
    const pick = (key) => filled(values[key], defaults[key])
    const list = (key) => asList(values[key], defaults[key])

    switch (seed?.id) {
        case 'habit-tracker':
            return [
                `Create a habit tracker named "${pick('name')}" with accent color ${pick('accent')}.`,
                'Habits to start with (one per line):',
                list('habits'),
                'Include daily checkboxes, streak counters, a weekly heatmap, and add/rename/archive habits.',
                CUSTOMIZE_HINT,
            ].join('\n')
        case 'invoice':
            return [
                `Design a professional invoice from "${pick('company')}" billed to "${pick('client')}".`,
                `Currency: ${pick('currency')}. Accent: ${pick('accent')}.`,
                'Line items (one per line, "label — amount"):',
                list('items'),
                'Include company/client blocks, a line-items table, live subtotal/tax/total, payment status, and print/download.',
                CUSTOMIZE_HINT,
            ].join('\n')
        case 'link-in-bio':
            return [
                `Design a mobile-first link-in-bio page for "${pick('name')}".`,
                `Bio: ${pick('bio')}`,
                `Accent: ${pick('accent')}.`,
                'Links (one per line, "label — URL"):',
                list('links'),
                'Include avatar (initials fallback), short bio, and a vertical stack of link buttons.',
                CUSTOMIZE_HINT,
            ].join('\n')
        case 'team-directory':
            return [
                `Build an internal team directory for "${pick('org')}" with accent color ${pick('accent')}.`,
                `Departments: ${pick('departments')}`,
                'People (one per line, "Name — Role — Department"):',
                list('people'),
                'Include search, department filters, member cards, and a profile modal with contact details.',
                CUSTOMIZE_HINT,
            ].join('\n')
        default:
            return String(seed?.prompt || '').trim()
    }
}

/** Pick `count` unique seeds (stable for the current page load when memoized by the caller). */
export function pickRandomSeeds(count, pool = SEEDS) {
    const list = Array.isArray(pool) ? [...pool] : []
    const n = Math.min(Math.max(0, count), list.length)

    for (let i = list.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[list[i], list[j]] = [list[j], list[i]]
    }

    return list.slice(0, n)
}

/** Match .lab-layout-pane */
export const MORPH_MS = 550

/** Workspace chat rail width after user drags (session-only — not persisted). */
export const RAIL_MIN_W = 280
export const RAIL_MAX_W = 560

/**
 * Primary CTA — Theme Customizer accent (same as dashboard krikkit:button default).
 * Icon / square actions should pair with `rounded-full` like krikkit square buttons.
 */
export const LAB_BTN_PRIMARY =
    'bg-accent text-accent-foreground transition hover:opacity-90 disabled:pointer-events-none disabled:opacity-40'

/** Inverse fill — not accent; rare (e.g. stop chrome). Prefer LAB_BTN_PRIMARY for actions. */
export const LAB_BTN_FILL =
    'bg-krikkit-fill text-krikkit-on-fill transition hover:opacity-90 disabled:pointer-events-none disabled:opacity-40'

/** Matches krikkit:button outline / ghost chip chrome. */
export const LAB_BTN_OUTLINE =
    'border border-krikkit-line bg-transparent text-krikkit-muted transition hover:bg-krikkit-soft hover:text-krikkit-fg disabled:pointer-events-none disabled:opacity-40'
