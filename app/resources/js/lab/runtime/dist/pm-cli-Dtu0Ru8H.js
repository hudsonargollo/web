import { t as I } from "./pako.esm-DQUXHgNn.js";
import "./config-BUEL78Ec.js";
import { t as X } from "./tarball-cache-DPLSvKtI.js";
import { n as M } from "./cross-origin-n9Rrvq6y.js";
import { n as K, t as R } from "./registry-client-BK4-jiG_.js";
function Oe(t) {
  let e = 0;
  for (let n = 0; n < t.length; n++)
    e = (e << 5) - e + t.charCodeAt(n), e |= 0;
  return e.toString(36);
}
var Y = /^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/;
function O(t) {
  const e = t.match(Y);
  return e ? {
    major: Number(e[1]),
    minor: Number(e[2]),
    patch: Number(e[3]),
    prerelease: e[4]
  } : null;
}
function w(t, e) {
  const n = O(t), r = O(e);
  if (!n || !r) return t.localeCompare(e);
  const i = n.major - r.major;
  if (i !== 0) return i;
  const s = n.minor - r.minor;
  if (s !== 0) return s;
  const o = n.patch - r.patch;
  return o !== 0 ? o : n.prerelease && !r.prerelease ? -1 : !n.prerelease && r.prerelease ? 1 : n.prerelease && r.prerelease ? Q(n.prerelease, r.prerelease) : 0;
}
function Q(t, e) {
  const n = t.split("."), r = e.split("."), i = Math.max(n.length, r.length);
  for (let s = 0; s < i; s++) {
    if (s >= n.length) return -1;
    if (s >= r.length) return 1;
    const o = /^\d+$/.test(n[s]), c = /^\d+$/.test(r[s]);
    if (o && c) {
      const u = Number(n[s]) - Number(r[s]);
      if (u !== 0) return u;
    } else {
      if (o !== c) return o ? -1 : 1;
      {
        const u = n[s].localeCompare(r[s]);
        if (u !== 0) return u;
      }
    }
  }
  return 0;
}
function b(t, e) {
  const n = O(t);
  if (!n || n.prerelease && !(e.match(/\d+\.\d+\.\d+(?:-[^\s)]*)?/g) || []).some((i) => {
    if (!i.includes("-")) return !1;
    const s = O(i);
    return s && s.major === n.major && s.minor === n.minor && s.patch === n.patch;
  }))
    return !1;
  if (e = e.trim(), e === "*" || e === "latest" || e === "") return !0;
  if (e.includes("||")) return e.split("||").some((i) => b(t, i.trim()));
  if (e.includes(" - ")) {
    const [i, s] = e.split(" - ").map((o) => o.trim());
    return w(t, i) >= 0 && w(t, s) <= 0;
  }
  const r = e.match(/(>=|<=|>|<|=)\s*(\d+(?:\.\d+)?(?:\.\d+)?(?:-[^\s]*)?)/g);
  if (r && r.length > 1) return r.every((i) => {
    const s = i.match(/^(>=|<=|>|<|=)\s*(\d+(?:\.\d+)?(?:\.\d+)?(?:-[^\s]*)?)$/);
    if (!s) return !0;
    const o = s[1];
    let c = s[2];
    const u = (c.match(/\./g) || []).length;
    return u === 0 ? c += ".0.0" : u === 1 && (c += ".0"), Z(t, o, c);
  });
  if (e.startsWith("^")) {
    const i = S(e.slice(1).trim()), s = O(i);
    return !s || n.major !== s.major || s.major === 0 && (s.minor !== 0 && n.minor !== s.minor || s.minor === 0 && (n.minor !== 0 || n.patch !== s.patch)) ? !1 : w(t, i) >= 0;
  }
  if (e.startsWith("~")) {
    const i = e.slice(1).trim(), s = i.replace(/[xX*]/g, "0").split("."), o = S(i), c = O(o);
    return c ? s.length === 1 ? n.major === c.major && w(t, o) >= 0 : n.major === c.major && n.minor === c.minor && w(t, o) >= 0 : !1;
  }
  if (e.startsWith(">=")) return w(t, S(e.slice(2).trim())) >= 0;
  if (e.startsWith(">")) return w(t, S(e.slice(1).trim())) > 0;
  if (e.startsWith("<=")) return w(t, S(e.slice(2).trim())) <= 0;
  if (e.startsWith("<")) return w(t, S(e.slice(1).trim())) < 0;
  if (e.startsWith("=")) return w(t, S(e.slice(1).trim())) === 0;
  if (e.includes("x") || e.includes("X") || e.includes("*") || /^\d+$/.test(e) || /^\d+\.\d+$/.test(e)) {
    const i = e.replace(/[xX*]/g, "").split(".").filter(Boolean);
    if (i.length === 1) return n.major === Number(i[0]);
    if (i.length === 2) return n.major === Number(i[0]) && n.minor === Number(i[1]);
  }
  if (e.includes(" ")) return e.split(/\s+/).filter(Boolean).every((i) => b(t, i));
  if (/^\d+\.\d+\.\d+/.test(e)) {
    const i = e.match(/^(\d+\.\d+\.\d+(?:-[^\s]+)?)/);
    if (i) return w(t, i[1]) === 0;
  }
  return w(t, e) === 0;
}
function S(t) {
  const e = t.replace(/[xX*]/g, "0").split(".");
  for (; e.length < 3; ) e.push("0");
  return e.join(".");
}
function Z(t, e, n) {
  const r = w(t, n);
  switch (e) {
    case ">=":
      return r >= 0;
    case "<=":
      return r <= 0;
    case ">":
      return r > 0;
    case "<":
      return r < 0;
    default:
      return r === 0;
  }
}
function C(t, e) {
  const n = [...t].sort((r, i) => w(i, r));
  for (const r of n) if (b(r, e)) return r;
  return null;
}
function ee(t) {
  if (!t.startsWith("npm:")) return null;
  const e = t.slice(4);
  let n;
  return e.startsWith("@") ? n = e.indexOf("@", 1) : n = e.indexOf("@"), n === -1 ? {
    realName: e,
    realRange: "latest"
  } : {
    realName: e.slice(0, n),
    realRange: e.slice(n + 1)
  };
}
function U(t, e) {
  return {
    registry: t,
    completed: /* @__PURE__ */ new Map(),
    rootPromises: /* @__PURE__ */ new Map(),
    placementPromises: /* @__PURE__ */ new Map(),
    config: e
  };
}
async function ve(t, e = "latest", n = {}) {
  const r = U(n.registry || new R(), n);
  return await _(t, e, r), r.completed;
}
async function Pe(t, e = {}) {
  const n = U(e.registry || new R(), e), r = { ...t.dependencies };
  e.devDependencies && t.devDependencies && Object.assign(r, t.devDependencies);
  const i = e.optionalDependencies && t.optionalDependencies ? Object.entries(t.optionalDependencies) : [], s = Object.entries(r);
  for (const [o, c] of s) await _(o, c, n, "", { walkEdges: !1 });
  for (const [o, c] of i) try {
    await _(o, c, n, "", { walkEdges: !1 });
  } catch {
  }
  for (const [o] of s) await L(o, n);
  for (const [o] of i) try {
    await L(o, n);
  } catch {
  }
  return n.completed;
}
async function _(t, e, n, r = "", i = {}) {
  const s = i.walkEdges !== !1, { rootPromises: o, placementPromises: c, completed: u } = n, a = ee(e), l = t, f = a?.realName ?? t;
  e = a?.realRange ?? e;
  const d = o.get(l);
  if (!d) {
    const P = l, k = te();
    o.set(l, k.promise);
    try {
      const $ = await J(P, f, l, e, n, s);
      k.resolve($);
    } catch ($) {
      throw o.delete(l), k.reject($), k.promise.catch(() => {
      }), $;
    }
    return;
  }
  let h;
  const y = u.get(l);
  if (y) h = y;
  else try {
    h = await d;
  } catch {
    return;
  }
  if (b(h.version, e) || !r) return;
  const g = `${r}/node_modules/${l}`, v = c.get(g);
  if (v) {
    await v;
    return;
  }
  if (u.has(g))
    return b(u.get(g).version, e), void 0;
  const j = J(g, f, l, e, n);
  c.set(g, j.then(() => {
  })), await j;
}
function te() {
  let t, e;
  return {
    promise: new Promise((n, r) => {
      t = n, e = r;
    }),
    resolve: t,
    reject: e
  };
}
async function J(t, e, n, r, i, s = !0) {
  const { registry: o, completed: c, config: u } = i, a = c.get(t);
  if (a) return a;
  u.onProgress?.(`Resolving ${e}@${r}`);
  const l = await o.fetchManifest(e), f = Object.keys(l.versions);
  let d;
  if (r === "latest" || r === "*") d = l["dist-tags"].latest;
  else if (l["dist-tags"][r]) d = l["dist-tags"][r];
  else {
    const g = C(f, r);
    if (!g) throw new Error(`Could not find a version of "${e}" matching "${r}"`);
    d = g;
  }
  const h = l.versions[d], y = {
    name: n,
    fetchName: e,
    version: d,
    tarballUrl: h.dist.tarball,
    dependencies: h.dependencies || {},
    shasum: h.dist.shasum
  };
  return c.set(t, y), s && await H(t, n, h, i), y;
}
async function L(t, e) {
  const n = e.completed.get(t);
  if (!n) return;
  const r = (await e.registry.fetchManifest(n.fetchName)).versions[n.version];
  r && await H(t, n.name, r, e);
}
async function q(t, e, n, r) {
  try {
    await _(t, e, n, r);
  } catch {
  }
}
async function H(t, e, n, r) {
  const i = {}, s = {};
  if (n.peerDependencies) {
    const a = n.peerDependenciesMeta || {};
    for (const [l, f] of Object.entries(n.peerDependencies)) a[l]?.optional || (i[l] = f);
  }
  if (n.dependencies && Object.assign(i, n.dependencies), n.optionalDependencies) {
    const a = Object.entries(n.optionalDependencies);
    if (r.config.optionalDependencies) for (const [l, f] of a) s[l] = f;
    else {
      const l = Object.keys(n.optionalDependencies);
      let f = !1;
      for (const [d, h] of Object.entries(n.optionalDependencies)) (d.includes("wasm32-wasi") || d.includes("wasm")) && (s[d] = h, f = !0);
      if (!f && l.length >= 2) {
        const d = /-(darwin|linux|win32|freebsd|android|sunos)-(x64|x86|arm64|arm|ia32|s390x|ppc64|mips|riscv)/;
        if (l.every((h) => d.test(h))) {
          const h = [e + "-wasm32-wasi", e + "-wasm"];
          await Promise.all(h.map(async (y) => {
            await q(y, "*", r, t);
          }));
        }
      }
    }
  }
  const o = Object.entries(i), c = 8;
  for (let a = 0; a < o.length; a += c) {
    const l = o.slice(a, a + c);
    await Promise.all(l.map(([f, d]) => _(f, d, r, t)));
  }
  const u = Object.entries(s);
  for (let a = 0; a < u.length; a += c) {
    const l = u.slice(a, a + c);
    await Promise.all(l.map(([f, d]) => q(f, d, r, t)));
  }
}
var V = "deepthought-resolution-v1", ne = 216e5, B = 1, A = /* @__PURE__ */ new Map(), T = /* @__PURE__ */ new Map();
function G(t) {
  return new Request(`https://deepthought.invalid/resolution/${encodeURIComponent(t)}`);
}
function E(t) {
  return new Map([...t].map(([e, n]) => [e, {
    ...n,
    dependencies: { ...n.dependencies }
  }]));
}
async function re(t) {
  if (typeof caches > "u") return null;
  try {
    const e = await (await caches.open(V)).match(G(t));
    if (!e) return null;
    const n = await e.json();
    return n.schema !== B || !Array.isArray(n.entries) || !n.createdAt || Date.now() - n.createdAt > ne ? null : new Map(n.entries);
  } catch {
    return null;
  }
}
async function se(t, e) {
  if (!(typeof caches > "u"))
    try {
      await (await caches.open(V)).put(G(t), new Response(JSON.stringify({
        schema: B,
        createdAt: Date.now(),
        entries: [...e]
      }), { headers: { "content-type": "application/json" } }));
    } catch {
    }
}
async function _e(t, e) {
  const n = A.get(t);
  if (n) return {
    tree: E(n),
    hit: !0
  };
  const r = await re(t);
  if (r)
    return A.set(t, r), {
      tree: E(r),
      hit: !0
    };
  let i = T.get(t);
  const s = !!i;
  i || (i = e(), T.set(t, i));
  try {
    const o = await i;
    return A.set(t, E(o)), s || await se(t, o), {
      tree: E(o),
      hit: s
    };
  } finally {
    s || T.delete(t);
  }
}
function ie() {
  A.clear(), T.clear();
}
function N(t, e) {
  return t.toString(8).padStart(e - 1, "0") + "\0";
}
function oe(t) {
  let e = 0;
  for (let n = 0; n < 512; n++) e += t[n];
  return e;
}
function ce(t, e, n, r) {
  const i = /* @__PURE__ */ new Uint8Array(512), s = new TextEncoder(), o = s.encode(t.slice(0, 100));
  i.set(o, 0), i.set(s.encode(N(n, 8)), 100), i.set(s.encode(N(0, 8)), 108), i.set(s.encode(N(0, 8)), 116), i.set(s.encode(N(e, 12)), 124), i.set(s.encode(N(Math.floor(r / 1e3), 12)), 136), i.set(s.encode("        "), 148), i[156] = 48, i.set(s.encode("ustar\0"), 257), i.set(s.encode("00"), 263);
  const c = N(oe(i), 7) + " ";
  return i.set(s.encode(c.slice(0, 8)), 148), i;
}
function ae(t) {
  const e = [], n = Date.now();
  for (const o of t) {
    const c = typeof o.content == "string" ? new TextEncoder().encode(o.content) : o.content, u = o.path.replace(/^\//, "");
    e.push(ce(u, c.length, o.mode ?? 420, o.mtime ?? n)), e.push(c);
    const a = (512 - c.length % 512) % 512;
    a && e.push(new Uint8Array(a));
  }
  e.push(/* @__PURE__ */ new Uint8Array(1024));
  let r = 0;
  for (const o of e) r += o.length;
  const i = new Uint8Array(r);
  let s = 0;
  for (const o of e)
    i.set(o, s), s += o.length;
  return i;
}
function ue(t) {
  return I.gzip(ae(t));
}
var p = (t = "", e = 0) => ({
  stdout: t,
  stderr: "",
  exitCode: e
}), m = (t, e = 1) => ({
  stdout: "",
  stderr: t,
  exitCode: e
});
function le(t) {
  return t.some((e) => e === "-g" || e === "--global" || e === "--location=global");
}
function De(t, e) {
  return le(t) ? m(`${e}: global installs (-g/--global) are not supported in deepthought
`) : null;
}
function F(t, e) {
  const n = {}, r = [`${e}/.npmrc`, "/home/user/.npmrc"];
  for (const i of r) try {
    if (!t.existsSync(i)) continue;
    const s = t.readFileSync(i, "utf8");
    for (const o of s.split(`
`)) {
      const c = o.trim();
      if (!c || c.startsWith("#") || c.startsWith(";")) continue;
      const u = c.indexOf("=");
      u <= 0 || (n[c.slice(0, u).trim()] = c.slice(u + 1).trim());
    }
  } catch {
  }
  return n;
}
function fe(t, e, n, r) {
  const i = `${e}/.npmrc`;
  let s = [];
  try {
    t.existsSync(i) && (s = t.readFileSync(i, "utf8").split(`
`));
  } catch {
  }
  let o = !1;
  const c = s.map((a) => {
    const l = a.trim();
    if (!l || l.startsWith("#") || l.startsWith(";")) return a;
    const f = l.indexOf("=");
    return f > 0 && l.slice(0, f).trim() === n ? (o = !0, `${n}=${r}`) : a;
  });
  o || c.push(`${n}=${r}`);
  const u = i.substring(0, i.lastIndexOf("/"));
  u && u !== "/" && !t.existsSync(u) && t.mkdirSync(u, { recursive: !0 }), t.writeFileSync(i, c.filter((a, l, f) => !(a === "" && l === f.length - 1)).join(`
`) + `
`);
}
function de(t, e, n) {
  const r = `${e}/.npmrc`;
  if (!t.existsSync(r)) return;
  const i = t.readFileSync(r, "utf8").split(`
`).filter((s) => {
    const o = s.trim();
    if (!o || o.startsWith("#") || o.startsWith(";")) return !0;
    const c = o.indexOf("=");
    return !(c > 0 && o.slice(0, c).trim() === n);
  });
  t.writeFileSync(r, i.join(`
`));
}
function D(t, e, n) {
  const r = F(t, e);
  return (n.npm_config_registry || r.registry || "https://registry.npmjs.org/").replace(/\/+$/, "");
}
function pe(t, e, n, r) {
  if (n.NPM_TOKEN) return n.NPM_TOKEN;
  if (n.NODE_AUTH_TOKEN) return n.NODE_AUTH_TOKEN;
  const i = F(t, e);
  if (i["//registry.npmjs.org/:_authToken"]) return i["//registry.npmjs.org/:_authToken"];
  try {
    const s = `//${new URL(r.endsWith("/") ? r : r + "/").host}/:_authToken`;
    if (i[s]) return i[s];
  } catch {
  }
  return i._authToken;
}
function Ee(t, e, n) {
  const r = e[0], i = F(t, n.cwd), s = D(t, n.cwd, n.env);
  if (!r || r === "list") {
    let o = `; deepthought project config
`;
    o += `prefix = "${n.cwd}"
`, o += `registry = "${s}/"
`;
    for (const [c, u] of Object.entries(i))
      c !== "registry" && (o += `${c} = ${u}
`);
    return p(o);
  }
  if (r === "get") {
    const o = e[1];
    return o ? o === "prefix" ? p(n.cwd + `
`) : o === "registry" ? p(s + `/
`) : i[o] !== void 0 ? p(i[o] + `
`) : p(`undefined
`) : m(`npm config get requires a key
`);
  }
  if (r === "set") {
    const o = e[1], c = e.slice(2).join(" ");
    return !o || !c ? m(`npm config set requires <key> <value>
`) : (fe(t, n.cwd, o, c), p());
  }
  if (r === "delete" || r === "rm" || r === "remove") {
    const o = e[1];
    return o ? (de(t, n.cwd, o), p()) : m(`npm config delete requires a key
`);
  }
  return m(`config: unknown subcommand "${r}"
`);
}
function me(t, e) {
  const n = e.split(".");
  let r = t;
  for (const i of n) {
    if (r == null || typeof r != "object") return;
    r = r[i];
  }
  return r;
}
function he(t, e, n) {
  const r = e.split(".");
  let i = t;
  for (let s = 0; s < r.length - 1; s++)
    (i[r[s]] == null || typeof i[r[s]] != "object") && (i[r[s]] = {}), i = i[r[s]];
  i[r[r.length - 1]] = n;
}
function ge(t, e) {
  const n = e.split(".");
  let r = t;
  for (let s = 0; s < n.length - 1; s++) {
    if (r == null || typeof r != "object") return !1;
    r = r[n[s]];
  }
  if (r == null || typeof r != "object") return !1;
  const i = n[n.length - 1];
  return i in r ? (delete r[i], !0) : !1;
}
function ye(t) {
  if (t === "true") return !0;
  if (t === "false") return !1;
  if (t === "null") return null;
  if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t);
  try {
    return JSON.parse(t);
  } catch {
    return t;
  }
}
function Ae(t, e, n) {
  const r = e[0], i = `${n.cwd}/package.json`;
  if (!t.existsSync(i)) return m(`npm pkg: no package.json found
`);
  let s;
  try {
    s = JSON.parse(t.readFileSync(i, "utf8"));
  } catch (o) {
    return m(`npm pkg: ${o?.message || "invalid package.json"}
`);
  }
  if (r === "get") {
    const o = e[1];
    if (!o) return p(JSON.stringify(s, null, 2) + `
`);
    const c = me(s, o);
    return p(c === void 0 ? `undefined
` : typeof c == "string" ? c + `
` : JSON.stringify(c, null, 2) + `
`);
  }
  if (r === "set") {
    const o = e.slice(1);
    if (o.length === 0) return m(`npm pkg set requires key=value
`);
    for (const c of o) {
      const u = c.indexOf("=");
      if (u <= 0) return m(`npm pkg set: invalid argument '${c}'
`);
      const a = c.slice(0, u), l = ye(c.slice(u + 1));
      he(s, a, l);
    }
    return t.writeFileSync(i, JSON.stringify(s, null, 2) + `
`), p();
  }
  if (r === "delete" || r === "rm" || r === "remove") {
    const o = e.slice(1);
    if (o.length === 0) return m(`npm pkg delete requires a key
`);
    for (const c of o) ge(s, c);
    return t.writeFileSync(i, JSON.stringify(s, null, 2) + `
`), p();
  }
  return m(`npm pkg: unknown subcommand "${r ?? ""}"
`);
}
async function Te() {
  K(), ie();
  try {
    typeof caches < "u" && (await caches.delete("deepthought-registry-v1"), await caches.delete("deepthought-resolution-v1"));
  } catch {
  }
  try {
    await (await X())?.clear?.();
  } catch {
  }
  return p(`Cache cleared.
`);
}
async function We(t, e) {
  const n = D(t, e.cwd, e.env), r = `${n}/-/ping`, i = Date.now();
  try {
    const s = await M(r), o = Date.now() - i;
    return s.ok ? p(`npm notice PING ${n}/
npm notice PONG ${o}ms
`) : m(`npm ping: registry returned HTTP ${s.status}
`);
  } catch (s) {
    return m(`npm ping: ${s?.message || "network error"}
`);
  }
}
async function Me(t, e) {
  const n = D(t, e.cwd, e.env), r = pe(t, e.cwd, e.env, n);
  if (!r) return m(`npm whoami: not authenticated (set NPM_TOKEN or //registry...:_authToken in .npmrc)
`);
  try {
    const i = await M(`${n}/-/whoami`, { headers: { Authorization: `Bearer ${r}` } });
    if (i.status === 401 || i.status === 403) return m(`npm whoami: unauthorized
`);
    if (!i.ok) return m(`npm whoami: HTTP ${i.status}
`);
    const s = await i.json(), o = s.username || s.name;
    return o ? p(o + `
`) : m(`npm whoami: empty response
`);
  } catch (i) {
    return m(`npm whoami: ${i?.message || "network error"}
`);
  }
}
function x(t, e) {
  const n = `${e}/node_modules`, r = [];
  if (!t.existsSync(n)) return r;
  const i = (s, o) => {
    try {
      for (const c of t.readdirSync(s)) {
        if (c.startsWith(".")) continue;
        const u = `${s}/${c}`;
        if (c.startsWith("@") && !o) {
          i(u, c);
          continue;
        }
        const a = o ? `${o}/${c}` : c;
        try {
          const l = t.readFileSync(`${u}/package.json`, "utf8"), f = JSON.parse(l);
          r.push({
            name: a,
            version: f.version || "0.0.0",
            dir: u
          });
        } catch {
        }
      }
    } catch {
    }
  };
  return i(n), r;
}
async function Re(t, e) {
  const n = x(t, e.cwd), r = [];
  for (const s of n) try {
    const o = t.readFileSync(`${s.dir}/package.json`, "utf8"), c = JSON.parse(o).funding;
    if (!c) continue;
    const u = [], a = (l) => {
      l && (typeof l == "string" ? u.push(l) : Array.isArray(l) ? l.forEach(a) : typeof l == "object" && l.url && u.push(String(l.url)));
    };
    a(c);
    for (const l of u) r.push({
      name: s.name,
      version: s.version,
      url: l
    });
  } catch {
  }
  if (r.length === 0) return p(`0 packages are looking for funding
`);
  let i = `${r.length} package(s) looking for funding
`;
  for (const s of r) i += `${s.name}@${s.version}
  ${s.url}
`;
  return p(i);
}
async function Fe(t, e) {
  const n = D(t, e.cwd, e.env), r = new R({ endpoint: n }), i = `${e.cwd}/package.json`;
  let s = {};
  try {
    if (t.existsSync(i)) {
      const a = JSON.parse(t.readFileSync(i, "utf8"));
      s = {
        ...a.dependencies || {},
        ...a.devDependencies || {},
        ...a.optionalDependencies || {}
      };
    }
  } catch {
  }
  x(t, e.cwd).filter((a) => !a.name.includes("/") || a.name.startsWith("@") ? s[a.name] !== void 0 || (() => {
    const l = `${e.cwd}/node_modules`;
    return a.dir.startsWith(l + "/") && a.dir.slice(l.length + 1).split("/").length <= (a.name.startsWith("@") ? 2 : 1);
  })() : !1);
  const o = Object.keys(s), c = [];
  for (const a of o) {
    const l = s[a];
    let f = "";
    try {
      const d = `${e.cwd}/node_modules/${a}`;
      t.existsSync(`${d}/package.json`) && (f = JSON.parse(t.readFileSync(`${d}/package.json`, "utf8")).version);
    } catch {
    }
    if (f)
      try {
        const d = await r.fetchManifest(a), h = Object.keys(d.versions), y = C(h, l) || f, g = d["dist-tags"]?.latest || y;
        (w(f, g) < 0 || w(f, y) < 0) && c.push({
          name: a,
          current: f,
          wanted: y,
          latest: g
        });
      } catch {
      }
  }
  if (c.length === 0) return p("");
  let u = `Package  Current  Wanted  Latest
`;
  for (const a of c) u += `${a.name}  ${a.current}  ${a.wanted}  ${a.latest}
`;
  return p(u, 1);
}
async function xe(t, e) {
  const n = D(t, e.cwd, e.env), r = x(t, e.cwd);
  if (r.length === 0) return p(`found 0 vulnerabilities
`);
  const i = {};
  for (const s of r)
    i[s.name] || (i[s.name] = []), i[s.name].includes(s.version) || i[s.name].push(s.version);
  try {
    const s = await M(`${n}/-/npm/v1/security/advisories/bulk`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(i)
    });
    if (!s.ok) return m(`npm audit: registry returned HTTP ${s.status}
`);
    const o = await s.json();
    let c = 0, u = "";
    for (const [a, l] of Object.entries(o || {})) for (const f of l || [])
      c++, u += `${f.severity || "info"}  ${a}: ${f.title || "advisory"}${f.url ? ` (${f.url})` : ""}
`;
    return u += `found ${c} vulnerabilit${c === 1 ? "y" : "ies"}
`, {
      stdout: u,
      stderr: "",
      exitCode: c > 0 ? 1 : 0
    };
  } catch (s) {
    return m(`npm audit: ${s?.message || "network error"}
`);
  }
}
function we(t, e) {
  if (t.startsWith("node_modules/") || t === "node_modules" || t.startsWith(".git/") || t === ".git") return !0;
  for (const n of e)
    if (!(!n || n.startsWith("#"))) {
      if (n.endsWith("/")) {
        if (t === n.slice(0, -1) || t.startsWith(n)) return !0;
      } else if (n.includes("*")) {
        const r = new RegExp("^" + n.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") + "$");
        if (r.test(t) || r.test(t.split("/").pop() || "")) return !0;
      } else if (t === n || t.endsWith("/" + n)) return !0;
    }
  return !1;
}
function Je(t, e) {
  const n = `${e.cwd}/package.json`;
  if (!t.existsSync(n)) return m(`npm pack: no package.json found
`);
  let r;
  try {
    r = JSON.parse(t.readFileSync(n, "utf8"));
  } catch (g) {
    return m(`npm pack: ${g?.message || "invalid package.json"}
`);
  }
  const i = (r.name || "package").replace(/^@/, "").replace(/\//g, "-"), s = r.version || "0.0.0", o = `${i}-${s}.tgz`;
  let c = [];
  try {
    t.existsSync(`${e.cwd}/.npmignore`) && (c = t.readFileSync(`${e.cwd}/.npmignore`, "utf8").split(`
`).map((g) => g.trim()));
  } catch {
  }
  const u = Array.isArray(r.files) ? r.files : null, a = [], l = (g, v) => {
    for (const j of t.readdirSync(g)) {
      if (j === "node_modules" || j === ".git") continue;
      const P = `${g}/${j}`, k = (v ? `${v}/` : "") + j;
      if (t.statSync(P).isDirectory()) l(P, k);
      else {
        if (we(k, c) || u && !(k === "package.json" || k === "README.md" || k === "LICENSE" || k === "license" || u.some((W) => k === W || k.startsWith(W.replace(/\/$/, "") + "/") || k === W.replace(/\/$/, ""))))
          continue;
        const $ = t.readFileSync(P), z = typeof $ == "string" ? new TextEncoder().encode($) : $ instanceof Uint8Array ? $ : new TextEncoder().encode(String($));
        a.push({
          path: `package/${k}`,
          content: z
        });
      }
    }
  };
  l(e.cwd, "");
  const f = ue(a), d = `${e.cwd}/${o}`.replace(/\/+/g, "/");
  t.writeFileSync(d, f);
  const h = "npm notice";
  let y = `${h}
`;
  y += `${h} package: ${r.name}@${s}
`;
  for (const g of a) y += `${h} ${g.path}
`;
  return y += `${h} total files: ${a.length}
`, y += `${o}
`, p(y);
}
function Le(t, e) {
  const n = `${e}/package-lock.json`;
  if (!t.existsSync(n)) return null;
  try {
    const r = JSON.parse(t.readFileSync(n, "utf8")), i = [];
    if (r.packages && typeof r.packages == "object") for (const [s, o] of Object.entries(r.packages)) {
      if (!s || s === "" || !o || !o.version) continue;
      const c = o.name || (s.startsWith("node_modules/") ? s.replace(/^node_modules\//, "").replace(/\/node_modules\//g, "/") : s);
      s.includes("/node_modules/") && `${c}`, s.startsWith("node_modules/") && (s.slice(13).split("/node_modules/").length > 1 || i.push({
        name: c,
        version: o.version,
        resolved: o.resolved,
        integrity: o.integrity
      }));
    }
    else if (r.dependencies && typeof r.dependencies == "object") for (const [s, o] of Object.entries(r.dependencies)) i.push({
      name: s,
      version: o.version,
      resolved: o.resolved,
      integrity: o.integrity
    });
    return {
      packages: i,
      lockfileVersion: r.lockfileVersion || 1
    };
  } catch {
    return null;
  }
}
function qe(t, e, n) {
  const r = `${e}/package.json`;
  if (!t.existsSync(r)) return {
    ok: !1,
    reason: "Missing package.json"
  };
  let i;
  try {
    i = JSON.parse(t.readFileSync(r, "utf8"));
  } catch {
    return {
      ok: !1,
      reason: "Invalid package.json"
    };
  }
  const s = {
    ...i.dependencies || {},
    ...i.devDependencies || {},
    ...i.optionalDependencies || {}
  }, o = new Map(n.map((c) => [c.name, c.version]));
  for (const [c, u] of Object.entries(s)) {
    const a = o.get(c);
    if (!a) return {
      ok: !1,
      reason: `package-lock.json missing entry for "${c}"`
    };
    if (!b(a, u) && u !== a && u !== `=${a}` && !u.startsWith("npm:") && w(a, u.replace(/^[\^=~]/, "")) < 0 && !b(a, u))
      return {
        ok: !1,
        reason: `package.json "${c}"@${u} does not match lock ${a}`
      };
  }
  return { ok: !0 };
}
function Ce(t, e, n, r) {
  const i = { "": {
    name: r?.name || "",
    version: r?.version || "0.0.0",
    dependencies: Object.fromEntries([...n.entries()].map(([o, c]) => [o, c.version]))
  } };
  for (const [o, c] of n) i[`node_modules/${o}`] = {
    version: c.version,
    resolved: c.tarballUrl,
    dependencies: c.dependencies || {}
  };
  const s = {
    name: r?.name || "",
    version: r?.version || "0.0.0",
    lockfileVersion: 3,
    requires: !0,
    packages: i
  };
  t.writeFileSync(`${e}/package-lock.json`, JSON.stringify(s, null, 2) + `
`);
}
export {
  Pe as _,
  Fe as a,
  Ae as c,
  Le as d,
  De as f,
  ve as g,
  _e as h,
  Re as i,
  Me as l,
  Ce as m,
  xe as n,
  Je as o,
  D as p,
  Ee as r,
  We as s,
  Te as t,
  qe as u,
  Oe as v
};

//# sourceMappingURL=pm-cli-Dtu0Ru8H.js.map