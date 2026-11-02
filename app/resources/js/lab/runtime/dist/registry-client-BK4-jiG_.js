import { n as w } from "./rolldown-runtime-DpiKQypI.js";
import { v as S } from "./config-BUEL78Ec.js";
import { n as g, t as E } from "./cross-origin-n9Rrvq6y.js";
var A = /* @__PURE__ */ w({
  RegistryClient: () => y,
  default: () => y,
  flushSharedRegistryCache: () => _
}), M = S, R = "deepthought-registry-v1", m = 216e5, v = 256, o = /* @__PURE__ */ new Map(), d = /* @__PURE__ */ new Map();
function u(t, e) {
  for (o.delete(t), o.set(t, e); o.size > v; ) {
    const r = o.keys().next().value;
    if (r === void 0) break;
    o.delete(r);
  }
}
async function C() {
  if (typeof caches > "u") return null;
  try {
    return await caches.open(R);
  } catch {
    return null;
  }
}
function $(t) {
  return t.replace(/\//g, "%2f");
}
var y = class {
  baseUrl;
  metadataStore;
  profiler;
  constructor(t = {}) {
    this.baseUrl = (t.endpoint || M).replace(/\/+$/, ""), this.metadataStore = t.metadataCache || /* @__PURE__ */ new Map(), this.profiler = t.profiler ?? null;
  }
  async fetchManifest(t) {
    const e = this.metadataStore.get(t);
    if (e) return e;
    const r = `${this.baseUrl}/${$(t)}`, a = `${this.baseUrl}|${t}`, i = o.get(a);
    if (i)
      return this.metadataStore.set(t, i), i;
    const c = d.get(a);
    if (c) return c;
    const h = this.fetchAndCacheManifest(t, r, a);
    d.set(a, h);
    try {
      return await h;
    } finally {
      d.delete(a);
    }
  }
  async fetchAndCacheManifest(t, e, r) {
    const a = this.profiler?.begin("packages.registry.fetchManifest", {
      category: "packages",
      metadata: { packageName: t }
    }) ?? null;
    try {
      return await this.fetchAndCacheManifestInternal(t, e, r);
    } finally {
      this.profiler?.end(a);
    }
  }
  async fetchAndCacheManifestInternal(t, e, r) {
    const a = await C(), i = a ? await a.match(e).catch(() => {
    }) : void 0, c = Number(i?.headers.get("x-deepthought-stored-at") ?? 0);
    if (i && c > 0 && Date.now() - c < m) {
      const s = await i.json();
      return this.metadataStore.set(t, s), u(r, s), s;
    }
    const h = { headers: { Accept: "application/vnd.npm.install-v1+json; q=1.0, application/json; q=0.8" } };
    let n, f = null;
    try {
      if (n = await g(e, h), n.status === 404 && E()) try {
        n = await fetch(e, h);
      } catch (s) {
        f = s instanceof Error ? s.message : String(s);
      }
    } catch (s) {
      const p = s instanceof Error ? s.message : String(s);
      throw new Error(`Failed to fetch package "${t}" from the registry (${p}). The package may not exist, or the registry blocked the browser request.`);
    }
    if (n.status === 404)
      throw f ? new Error(`Configured CORS proxy returned HTTP 404 for package "${t}"; the direct registry request also failed (${f}).`) : new Error(`Package "${t}" does not exist in the registry`);
    if (!n.ok) throw new Error(`Registry request for "${t}" failed with HTTP ${n.status}`);
    const l = await n.json();
    if (this.metadataStore.set(t, l), u(r, l), a) {
      const s = new Headers(n.headers);
      s.set("content-type", "application/json"), s.set("x-deepthought-stored-at", String(Date.now()));
      const p = JSON.stringify(l);
      a.put(e, new Response(p, {
        status: 200,
        headers: s
      })).catch(() => {
      });
    }
    return l;
  }
  async fetchVersion(t, e) {
    const r = await this.fetchManifest(t), a = r["dist-tags"][e] || e, i = r.versions[a];
    if (!i) throw new Error(`Version "${e}" does not exist for package "${t}"`);
    return i;
  }
  async getLatestVersion(t) {
    return (await this.fetchManifest(t))["dist-tags"].latest;
  }
  async listVersions(t) {
    const e = await this.fetchManifest(t);
    return Object.keys(e.versions);
  }
  async getTarballUrl(t, e) {
    return (await this.fetchVersion(t, e)).dist.tarball;
  }
  async downloadArchive(t) {
    const e = this.profiler?.begin("packages.registry.download", {
      category: "packages",
      metadata: { url: t }
    }) ?? null;
    let r;
    try {
      r = await g(t);
    } catch (a) {
      const i = a instanceof Error ? a.message : String(a);
      throw this.profiler?.end(e), new Error(`Tarball download failed (${i}): ${t}`);
    }
    if (!r.ok)
      throw this.profiler?.end(e), new Error(`Tarball download failed (HTTP ${r.status}): ${t}`);
    try {
      return await r.arrayBuffer();
    } finally {
      this.profiler?.end(e);
    }
  }
  flushCache() {
    this.metadataStore.clear();
  }
};
function _() {
  o.clear(), d.clear();
}
export {
  _ as n,
  A as r,
  y as t
};

//# sourceMappingURL=registry-client-BK4-jiG_.js.map