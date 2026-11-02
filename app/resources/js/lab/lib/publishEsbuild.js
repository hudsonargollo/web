const LAB_VITE_PLUGINS = new Set([
    'vite',
    '@vitejs/plugin-react',
    '@tailwindcss/vite',
])

const ENTRY_CANDIDATES = ['/src/main.jsx', '/src/main.tsx', '/src/main.js', '/src/main.ts']
const CSS_CANDIDATES = ['/src/index.css', '/src/styles.css', '/src/app.css']

/**
 * @param {any} pod
 * @param {string} path
 */
async function fileExists(pod, path) {
    if (typeof pod.fs.exists === 'function') {
        return pod.fs.exists(path)
    }
    try {
        await pod.fs.readFile(path)
        return true
    } catch {
        return false
    }
}

/**
 * @param {any} pod
 */
async function resolveEntryFile(pod) {
    for (const path of ENTRY_CANDIDATES) {
        if (await fileExists(pod, path)) return path
    }
    return null
}

/**
 * @param {any} pod
 */
async function resolveCssFile(pod, entry) {
    for (const path of CSS_CANDIDATES) {
        if (await fileExists(pod, path)) return path
    }
    if (! entry) return null
    try {
        const raw = await pod.fs.readFile(entry, 'utf8')
        const text = typeof raw === 'string' ? raw : String(raw)
        const match = text.match(/import\s+['"](\.\/[^'"]+\.css)['"]/)
        if (match?.[1]) {
            const dir = entry.slice(0, entry.lastIndexOf('/')) || '/src'
            const resolved = `${dir}/${match[1].replace(/^\.\//, '')}`.replace(/\/+/g, '/')
            if (await fileExists(pod, resolved)) return resolved
        }
    } catch {
        /* ignore */
    }
    return null
}

/**
 * Standard Lab Vite sites only — skip exotic plugin stacks.
 *
 * @param {any} pod
 */
async function hasExoticVitePlugins(pod) {
    const files = ['/vite.config.js', '/vite.config.ts', '/vite.config.mjs', '/vite.config.cjs']
    for (const file of files) {
        try {
            const raw = await pod.fs.readFile(file, 'utf8')
            const text = typeof raw === 'string' ? raw : String(raw)
            const imports = [...text.matchAll(/from\s*['"]([^'"]+)['"]/g)].map((m) => m[1])
            for (const spec of imports) {
                const name = spec.startsWith('@')
                    ? spec.split('/').slice(0, 2).join('/')
                    : spec.split('/')[0]
                if (! name || name.startsWith('.') || LAB_VITE_PLUGINS.has(name)) continue
                if (name === 'react' || name === 'react-dom') continue
                return true
            }
        } catch {
            /* no config */
        }
    }
    return false
}

/**
 * @param {any} pod
 */
export async function canUseEsbuildPublish(pod) {
    const entry = await resolveEntryFile(pod)
    if (! entry || ! await fileExists(pod, '/index.html')) return false
    if (await hasExoticVitePlugins(pod)) return false
    const css = await resolveCssFile(pod, entry)
    if (css && ! await fileExists(pod, '/node_modules/@tailwindcss/node/package.json')) {
        return false
    }
    return true
}

/**
 * @param {{ entry: string, css: string|null }} plan
 */
export async function writeEsbuildPublishScript(pod, plan) {
    const cssLine = plan.css ? `'${plan.css}'` : 'null'
    const script = [
        "import esbuild from 'esbuild'",
        "import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync, copyFileSync, unlinkSync } from 'fs'",
        "import { dirname, join } from 'path'",
        "import { compile, optimize } from '@tailwindcss/node'",
        '',
        `const ENTRY = '${plan.entry}'`,
        `const CSS_INPUT = ${cssLine}`,
        "const OUT_DIR = '/dist'",
        "const ASSETS = '/dist/assets'",
        '',
        'function ensureDir(path) {',
        '  if (!existsSync(path)) mkdirSync(path, { recursive: true })',
        '}',
        '',
        'function walkFiles(dir, out = []) {',
        '  if (!existsSync(dir)) return out',
        '  for (const name of readdirSync(dir)) {',
        "    if (!name || name === '.' || name === '..' || name === 'node_modules') continue",
        '    const full = join(dir, name).replace(/\\\\/g, "/")',
        '    let isDir = false',
        '    try { isDir = statSync(full).isDirectory() } catch { continue }',
        '    if (isDir) walkFiles(full, out)',
        '    else out.push(full)',
        '  }',
        '  return out',
        '}',
        '',
        'function extractCandidates(text) {',
        '  const found = new Set()',
        '  const patterns = [',
        '    /className\\s*=\\s*"([^"]+)"/g,',
        "    /className\\s*=\\s*'([^']+)'/g,",
        '    /className\\s*=\\s*\\{`([^`]+)`\\}/g,',
        '    /class\\s*=\\s*"([^"]+)"/g,',
        "    /class\\s*=\\s*'([^']+)'/g,",
        '  ]',
        '  for (const re of patterns) {',
        '    let match',
        '    while ((match = re.exec(text))) {',
        '      for (const token of String(match[1] || "").split(/\\s+/)) {',
        '        const value = token.trim()',
        '        if (value) found.add(value)',
        '      }',
        '    }',
        '  }',
        '  return [...found]',
        '}',
        '',
        'function scanCandidates() {',
        '  const set = new Set()',
        '  for (const file of walkFiles("/src")) {',
        '    if (!/\\.(jsx?|tsx?|html)$/i.test(file)) continue',
        '    try {',
        '      for (const c of extractCandidates(readFileSync(file, "utf8"))) set.add(c)',
        '    } catch { /* ignore */ }',
        '  }',
        '  try {',
        '    for (const c of extractCandidates(readFileSync("/index.html", "utf8"))) set.add(c)',
        '  } catch { /* ignore */ }',
        '  return [...set]',
        '}',
        '',
        'function copyPublicDir() {',
        "  if (!existsSync('/public')) return",
        "  for (const file of walkFiles('/public')) {",
        "    const rel = file.slice('/public/'.length)",
        '    const dest = `${OUT_DIR}/${rel}`',
        '    ensureDir(dirname(dest))',
        '    copyFileSync(file, dest)',
        '  }',
        '}',
        '',
        'function writeIndexHtml() {',
        "  let html = readFileSync('/index.html', 'utf8')",
        "  html = html.replace(/<script[^>]+type=[\"']module[\"'][^>]*>\\s*<\\/script>/i, '')",
        "  html = html.replace(/<script[^>]+src=[\"']\\/src\\/[^\"']+[\"'][^>]*>\\s*<\\/script>/i, '')",
        '  const tags = []',
        '  if (CSS_INPUT) tags.push(\'<link rel="stylesheet" href="/assets/index.css">\')',
        '  tags.push(\'<script type="module" src="/assets/index.js"></script>\')',
        "  if (html.includes('</head>')) {",
        "    html = html.replace('</head>', `  ${tags.join('\\n  ')}\\n</head>`)",
        '  } else {',
        '    html += `\\n${tags.join("\\n")}\\n`',
        '  }',
        '  writeFileSync(`${OUT_DIR}/index.html`, html)',
        '}',
        '',
        // Keep the synthetic entry beside the real entry (/src/...) so `./App.jsx`
        // still resolves. Writing it at `/.__krikkit_publish_entry__.jsx` left
        // `import "./App.jsx"` in the shipped bundle and 404'd on the live host.
        "const JS_ENTRY = `${dirname(ENTRY)}/.__krikkit_publish_entry__.jsx`",
        'const entrySource = readFileSync(ENTRY, "utf8")',
        "const strippedEntry = entrySource.replace(/^\\s*import\\s+['\"][^'\"]+\\.css['\"]\\s*;?\\s*$/gm, '')",
        'writeFileSync(JS_ENTRY, strippedEntry)',
        '',
        'ensureDir(ASSETS)',
        '',
        'await esbuild.build({',
        '  entryPoints: [JS_ENTRY],',
        '  bundle: true,',
        '  format: "esm",',
        '  platform: "browser",',
        '  target: ["es2020"],',
        '  jsx: "automatic",',
        '  minify: true,',
        '  sourcemap: false,',
        '  metafile: false,',
        '  logLevel: "warning",',
        '  outfile: `${ASSETS}/index.js`,',
        '  absWorkingDir: "/",',
        '  write: true,',
        '  plugins: [{',
        "    name: 'ignore-css-imports',",
        '    setup(build) {',
        '      build.onResolve({ filter: /\\.css$/ }, (args) => ({',
        '        path: args.path,',
        "        namespace: 'css-stub',",
        '      }))',
        "      build.onLoad({ filter: /.*/, namespace: 'css-stub' }, () => ({",
        "        contents: '',",
        "        loader: 'js',",
        '      }))',
        '    },',
        '  }],',
        '  define: {',
        '    "process.env.NODE_ENV": \'"production"\',',
        '  },',
        '})',
        '',
        'try {',
        '  if (existsSync(JS_ENTRY)) unlinkSync(JS_ENTRY)',
        '} catch { /* ignore */ }',
        '',
        'if (CSS_INPUT) {',
        '  const cssInput = readFileSync(CSS_INPUT, "utf8")',
        '  const compiled = await compile(cssInput, {',
        '    base: dirname(CSS_INPUT),',
        '    onDependency() {},',
        '  })',
        '  const css = compiled.build(scanCandidates())',
        '  const optimized = optimize(css, { minify: true })',
        '  writeFileSync(`${ASSETS}/index.css`, optimized.code)',
        '}',
        '',
        'copyPublicDir()',
        'writeIndexHtml()',
        '',
    ].join('\n')

    await pod.fs.writeFile('/.__krikkit_esbuild_publish__.mjs', script)
}

/**
 * @param {any} pod
 */
export async function resolveEsbuildPublishPlan(pod) {
    if (! await canUseEsbuildPublish(pod)) return null
    const entry = await resolveEntryFile(pod)
    if (! entry) return null
    const css = await resolveCssFile(pod, entry)
    return {
        mode: 'esbuild',
        label: 'esbuild production build',
        entry,
        css,
    }
}
