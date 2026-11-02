import { n as j } from "./rolldown-runtime-DpiKQypI.js";
import { a as w, i as T, n as S, o as b } from "./offload-CwAvnXl4.js";
import { n as p } from "./esbuild-engine-DrysNYR_.js";
var E = 1048576;
function R(t, r = 64, n = E) {
  const e = [];
  let s = [], i = 0;
  for (const c of t) {
    const f = c.source.length;
    s.length > 0 && (s.length >= r || i + f > n) && (e.push(s), s = [], i = 0), s.push(c), i += f;
  }
  return s.length > 0 && e.push(s), e;
}
var v = [
  /<[A-Z][a-zA-Z0-9.]*[\s/>]/,
  /<\/[a-zA-Z]/,
  /\/>/,
  /<>|<\/>/,
  /React\.createElement\b/,
  /jsx\(|jsxs\(|jsxDEV\(/
];
function B(t) {
  return v.some((r) => r.test(t));
}
var C = /* @__PURE__ */ j({
  convertFileDirect: () => P,
  convertPackage: () => W,
  patchBuiltinImports: () => m,
  prepareTransformer: () => I
}), d = typeof window < "u", h = [
  "assert",
  "buffer",
  "child_process",
  "cluster",
  "crypto",
  "dgram",
  "dns",
  "events",
  "fs",
  "http",
  "http2",
  "https",
  "net",
  "os",
  "path",
  "perf_hooks",
  "querystring",
  "readline",
  "stream",
  "string_decoder",
  "timers",
  "tls",
  "url",
  "util",
  "v8",
  "vm",
  "worker_threads",
  "zlib",
  "async_hooks",
  "inspector",
  "module"
].join("|"), A = new RegExp(`\\bimport\\s*\\(\\s*["']((?:node:)?(?:${h}))["']\\s*\\)`, "g"), F = new RegExp(`\\bimport\\s*\\(\\s*["'](?:node:)?(?:${h})["']`);
async function I() {
  d && await p();
}
function _(t, r) {
  return t.endsWith(".jsx") ? "jsx" : t.endsWith(".ts") ? "ts" : t.endsWith(".tsx") ? "tsx" : t.endsWith(".mjs") ? "js" : B(r) ? "jsx" : "js";
}
async function P(t, r) {
  if (!d) return t;
  const n = await p();
  if (!n) throw new Error("esbuild engine not available");
  const e = _(r, t);
  try {
    return m((await n.transform(t, {
      loader: e,
      format: "cjs",
      target: "esnext",
      platform: "neutral",
      define: {
        "import.meta.url": "import_meta.url",
        "import.meta.dirname": "import_meta.dirname",
        "import.meta.filename": "import_meta.filename",
        "import.meta": "import_meta"
      }
    })).code);
  } catch (s) {
    const i = s instanceof Error ? s.message : String(s);
    if (e === "js" || e === "jsx") {
      const c = e === "js" ? [
        "jsx",
        "tsx",
        "ts"
      ] : ["tsx"];
      for (const f of c) try {
        return m((await n.transform(t, {
          loader: f,
          format: "cjs",
          target: "esnext",
          platform: "neutral",
          define: {
            "import.meta.url": "import_meta.url",
            "import.meta.dirname": "import_meta.dirname",
            "import.meta.filename": "import_meta.filename",
            "import.meta": "import_meta"
          }
        })).code);
      } catch {
      }
    }
    if (i.includes("Top-level await")) try {
      return m((await n.transform(t, {
        loader: e,
        format: "esm",
        target: "esnext",
        platform: "neutral",
        define: {
          "import.meta.url": "import_meta.url",
          "import.meta.dirname": "import_meta.dirname",
          "import.meta.filename": "import_meta.filename",
          "import.meta": "import_meta"
        }
      })).code);
    } catch {
      return m(t);
    }
    return m(t);
  }
}
function k(t, r) {
  return t.endsWith(".mjs") || t.endsWith(".cjs") ? !1 : /\bimport\s+[\w{*'"]/m.test(r) || /\bexport\s+(?:default|const|let|var|function|class|{|\*)/m.test(r) || /\bimport\.meta\b/.test(r);
}
function u(t) {
  return F.test(t);
}
function m(t) {
  return t.replace(A, (r, n) => `Promise.resolve(require("${n}"))`);
}
function y(t, r) {
  const n = [];
  try {
    for (const e of t.readdirSync(r)) {
      const s = r + "/" + e;
      try {
        t.statSync(s).isDirectory() ? e !== "node_modules" && n.push(...y(t, s)) : (e.endsWith(".js") || e.endsWith(".mjs") || e.endsWith(".jsx")) && n.push(s);
      } catch {
      }
    }
  } catch {
  }
  return n;
}
function O(t, r) {
  try {
    const n = r + "/package.json";
    if (t.existsSync(n)) {
      const e = t.readFileSync(n, "utf8");
      return JSON.parse(e).type === "module";
    }
  } catch {
  }
  return !1;
}
async function W(t, r, n, e) {
  const s = e?.begin("modules.transform", {
    category: "modules",
    metadata: { path: r }
  }) ?? null;
  let i = 0;
  const c = y(t, r);
  n?.(`  Converting ${c.length} files in ${r}...`);
  const f = O(t, r), l = [];
  for (const a of c) try {
    const o = t.readFileSync(a, "utf8");
    if (f || a.endsWith(".mjs")) {
      u(o) && (t.writeFileSync(a, m(o)), i++);
      continue;
    }
    k(a, o) ? l.push({
      filePath: a,
      source: o,
      loader: _(a, o)
    }) : u(o) && (t.writeFileSync(a, m(o)), i++);
  } catch {
  }
  const g = R(l).map((a) => ({
    type: "transformBatch",
    id: w(),
    files: a,
    options: {
      format: "cjs",
      target: "esnext",
      platform: "neutral",
      define: {
        "import.meta.url": "import_meta.url",
        "import.meta.dirname": "import_meta.dirname",
        "import.meta.filename": "import_meta.filename",
        "import.meta": "import_meta"
      }
    },
    priority: b.NORMAL
  })), x = await Promise.all(g.map((a) => e ? T(a, e) : S(a)));
  for (const a of x) for (const o of a.results) try {
    t.writeFileSync(o.filePath, o.code), i++;
  } catch {
  }
  return e?.count("modules.transformedFiles", i), e?.end(s), i;
}
export {
  C as n,
  I as r,
  W as t
};

//# sourceMappingURL=module-transformer-Dv3pQY3p.js.map