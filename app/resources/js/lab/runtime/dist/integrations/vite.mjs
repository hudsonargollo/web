import { A as w, c as S, y as v } from "../lab-keys-CG3byUca.js";
import { n as d, t as y } from "../headers-BDWougG4.js";
import { dirname as E, resolve as A } from "node:path";
import { fileURLToPath as k } from "node:url";
import { readFile as p } from "node:fs/promises";
var T = ["../__worker__.js", "../../dist/__worker__.js"], u = null;
async function W(o) {
  const r = E(k(o));
  for (const s of T) {
    const a = A(r, s);
    try {
      return await p(a), a;
    } catch {
    }
  }
  return null;
}
async function f(o) {
  return u || (u = (async () => {
    const r = await W(o);
    return r ? p(r, "utf8") : null;
  })()), u;
}
var m = "/__worker__.js";
function R(o = {}) {
  const r = o.path ?? DEFAULT_SW_PATH, s = /* @__PURE__ */ new Set([...w(), r.replace(/\?.*$/, "")]);
  return {
    name: "deepthought",
    configureServer(a) {
      a.middlewares.use(async (n, e, l) => {
        const c = n.url?.split("?")[0];
        if (c === m) {
          const t = await f(import.meta.url).catch(() => null);
          if (t === null) return l();
          e.setHeader("Content-Type", "application/javascript; charset=utf-8"), e.setHeader("Cache-Control", "no-cache"), e.statusCode = 200, e.end(t);
          return;
        }
        if (!c || !s.has(c)) return l();
        try {
          const t = await d(import.meta.url), i = y();
          for (const [h, _] of Object.entries(i)) e.setHeader(h, _);
          e.statusCode = 200, e.end(t);
        } catch (t) {
          e.statusCode = 500, e.setHeader("Content-Type", "text/plain");
          const i = t instanceof Error ? t.message : String(t);
          e.end(`[lab-runtime/vite] failed to read service worker source: ${i}`);
        }
      });
    },
    async generateBundle() {
      const a = await d(import.meta.url);
      for (const e of [S, v]) this.emitFile({
        type: "asset",
        fileName: e,
        source: a
      });
      const n = await f(import.meta.url).catch(() => null);
      n !== null && this.emitFile({
        type: "asset",
        fileName: m.replace(/^\/+/, ""),
        source: n
      });
    }
  };
}
export {
  R as deepthought,
  R as default
};

//# sourceMappingURL=vite.mjs.map