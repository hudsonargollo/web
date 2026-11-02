import { n as L } from "./rolldown-runtime-DpiKQypI.js";
import "./pako.esm-DQUXHgNn.js";
import { a as E, i as F, n as O, o as P } from "./offload-CwAvnXl4.js";
import { t as I } from "./byte-encoding-DY8VFsBe.js";
import { A as S, D as k, S as _, k as B, n as K, t as U } from "./tarball-cache-DPLSvKtI.js";
import { n as v } from "./cross-origin-n9Rrvq6y.js";
var q = /* @__PURE__ */ L({
  downloadAndExtract: () => D,
  parseTarArchive: () => W,
  safeJoin: () => x
}), M = 20971520, A = Promise.resolve();
async function z(t) {
  const r = A;
  let n;
  A = new Promise((e) => {
    n = e;
  }), await r;
  try {
    return await t();
  } finally {
    n();
  }
}
function T(t, r) {
  if (t.existsSync(r)) {
    if (!t.statSync(r).isDirectory()) {
      t.unlinkSync(r);
      return;
    }
    for (const n of t.readdirSync(r)) T(t, B(r, n));
    t.rmdirSync(r);
  }
}
function x(t, r) {
  const n = S(t).replace(/\/+$/, ""), e = S(B(n, r));
  return e === n || e.startsWith(n + "/") ? e : null;
}
function H(t, r, n) {
  const e = /^sha(256|384|512)-([A-Za-z0-9+/=]+)$/.exec(r.trim());
  if (!e) throw new Error(`Unsupported integrity algorithm for ${n}: ${r}`);
  const i = `SHA-${e[1]}`, c = e[2], s = K(i, new Uint8Array(t));
  let f = "";
  for (let o = 0; o < s.length; o++) f += String.fromCharCode(s[o]);
  const d = btoa(f);
  if (d !== c) throw new Error(`Integrity check failed for ${n}: expected ${r}, got ${i.toLowerCase().replace("-", "")}-${d}`);
}
function m(t, r, n) {
  const e = t.slice(r, r + n), i = e.indexOf(0), c = i >= 0 ? e.slice(0, i) : e;
  return new TextDecoder().decode(c);
}
function C(t, r, n) {
  const e = m(t, r, n).trim();
  return parseInt(e, 8) || 0;
}
function R(t) {
  switch (t) {
    case "0":
    case "\0":
    case "":
      return "file";
    case "5":
      return "directory";
    case "1":
    case "2":
      return "link";
    default:
      return "other";
  }
}
function* W(t) {
  let n = 0;
  for (; n + 512 <= t.length; ) {
    const e = t.slice(n, n + 512);
    if (n += 512, e.every((h) => h === 0)) break;
    const i = m(e, 0, 100);
    if (!i) continue;
    const c = C(e, 100, 8), s = C(e, 124, 12), f = String.fromCharCode(e[156]), d = m(e, 157, 100), o = m(e, 345, 155), p = o ? `${o}/${i}` : i, y = R(f);
    let u;
    y === "file" && (u = s > 0 ? t.slice(n, n + s) : /* @__PURE__ */ new Uint8Array(0)), s > 0 && (n += Math.ceil(s / 512) * 512), yield {
      filepath: p,
      kind: y,
      byteSize: s,
      fileMode: c,
      payload: u,
      linkDestination: y === "link" ? d : void 0
    };
  }
}
async function D(t, r, n, e = {}) {
  if (!e.profiler) return b(t, r, n, e);
  const i = e.profiler?.begin("packages.extract", {
    category: "packages",
    metadata: { url: t }
  }) ?? null;
  try {
    return await b(t, r, n, e);
  } finally {
    e.profiler?.end(i);
  }
}
async function b(t, r, n, e) {
  e.onProgress?.(`Fetching ${t}...`);
  let i = null, c = null;
  try {
    c = await U(), c && (i = await c.get(t));
  } catch {
    c = null;
  }
  if (!i) {
    const a = await v(t);
    if (!a.ok) throw new Error(`Archive download failed (HTTP ${a.status}): ${t}`);
    i = await a.arrayBuffer();
  }
  e.expectedIntegrity && H(i, e.expectedIntegrity, t);
  const s = E(), f = `/.deepthought/install/${s}`, d = [];
  r.mkdirSync(f, { recursive: !0 });
  const o = new MessageChannel();
  let p;
  const y = new Promise((a) => {
    p = a;
  });
  o.port1.onmessage = (a) => {
    const l = a.data;
    if (l?.type === "done") {
      p();
      return;
    }
    l?.type !== "file" || !l.file || u(l.file);
  }, o.port1.start();
  const u = (a) => {
    if (e.filter && !e.filter(a.path)) return;
    const l = x(f, a.path), w = x(n, a.path);
    if (!l || !w) return;
    r.mkdirSync(k(l), { recursive: !0 });
    const g = a.data instanceof Uint8Array ? a.data : a.isBinary ? I(a.data) : a.data;
    r.writeFileSync(l, g), w.endsWith(".wasm") && g instanceof Uint8Array && _(g), d.push(w);
  };
  let h;
  const $ = e.profiler?.begin("workers.extract", { category: "workers" }) ?? null;
  try {
    const a = {
      type: "extract",
      id: s,
      tarballUrl: t,
      stripComponents: e.stripComponents ?? 1,
      priority: P.NORMAL,
      expectedShasum: e.expectedShasum,
      tarballBytes: i,
      wantTarball: !1,
      streamPort: o.port2
    };
    if (h = await z(() => e.profiler ? F(a, e.profiler) : O(a)), h.streamed) await y;
    else for (const l of h.files) u(l);
  } catch (a) {
    throw T(r, f), a;
  } finally {
    o.port1.close(), e.profiler?.end($);
  }
  return c && i.byteLength > 0 && i.byteLength <= M && c.put(t, i, e.expectedShasum).catch(() => {
  }), r.mkdirSync(k(n), { recursive: !0 }), r.renameSync(f, n), e.onProgress?.(`Extracted ${d.length} files`), e.profiler?.count("packages.extractedFiles", d.length), d;
}
export {
  D as n,
  q as t
};

//# sourceMappingURL=archive-extractor-B40pNYD_.js.map