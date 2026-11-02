import { r as p } from "./pako.esm-DQUXHgNn.js";
import { C as re, D as te, E as ne, M as se, O as ie, S as ue, T as be, in as ce, j as de, k as oe, l as ae, sn as T, t as fe, u as Le, w as me } from "./host-DYc69tNt.js";
import { j as X } from "./lab-keys-CG3byUca.js";
import { d as he, m as F, p as ye } from "./offload-CwAvnXl4.js";
import { existsSync as C, readFileSync as v } from "node:fs";
import { dirname as M, join as f } from "node:path";
import { fileURLToPath as O } from "node:url";
import { Worker as D } from "node:worker_threads";
import z from "node:http";
import { createHash as Z } from "node:crypto";
import { mkdir as q, readFile as h, readdir as H, unlink as J, writeFile as S } from "node:fs/promises";
import { tmpdir as k } from "node:os";
function B() {
  return `"use strict";
const { parentPort, workerData } = require("node:worker_threads");
if (!parentPort) throw new Error("deepthought worker shim: missing parentPort");

const messageListeners = new Set();
const errorListeners = new Set();

function emitMessage(data) {
  const ev = { data };
  for (const fn of messageListeners) {
    try { fn(ev); } catch (err) { console.error(err); }
  }
  if (typeof globalThis.onmessage === "function") {
    try { globalThis.onmessage(ev); } catch (err) { console.error(err); }
  }
}

globalThis.self = globalThis;
globalThis.postMessage = function postMessage(data, transfer) {
  if (Array.isArray(transfer) && transfer.length) {
    parentPort.postMessage(data, transfer);
  } else {
    parentPort.postMessage(data);
  }
};
globalThis.addEventListener = function addEventListener(type, fn) {
  if (type === "message") messageListeners.add(fn);
  else if (type === "error") errorListeners.add(fn);
};
globalThis.removeEventListener = function removeEventListener(type, fn) {
  if (type === "message") messageListeners.delete(fn);
  else if (type === "error") errorListeners.delete(fn);
};
globalThis.onmessage = null;
globalThis.onerror = null;

parentPort.on("message", function (data) { emitMessage(data); });
parentPort.on("error", function (err) {
  const ev = { message: err && err.message ? err.message : String(err), error: err };
  for (const fn of errorListeners) {
    try { fn(ev); } catch (_) { /* ignore */ }
  }
  if (typeof globalThis.onerror === "function") {
    try { globalThis.onerror(ev); } catch (_) { /* ignore */ }
  }
});

const source = workerData && workerData.__deepthoughtSource;
if (typeof source !== "string" || !source) {
  throw new Error("deepthought worker shim: missing __deepthoughtSource");
}
(0, eval)(source);
`;
}
function Q(r) {
  const i = /* @__PURE__ */ new Set(), u = /* @__PURE__ */ new Set();
  let b = null, t = null;
  return r.on("message", (e) => {
    const n = { data: e };
    for (const d of i) try {
      d(n);
    } catch {
    }
    if (b) try {
      b(n);
    } catch {
    }
  }), r.on("error", (e) => {
    const n = {
      message: e.message,
      error: e
    };
    for (const d of u) try {
      d(n);
    } catch {
    }
    if (t) try {
      t(n);
    } catch {
    }
  }), {
    postMessage(e, n) {
      n && n.length ? r.postMessage(e, n) : r.postMessage(e);
    },
    terminate() {
      r.terminate();
    },
    addEventListener(e, n) {
      e === "message" ? i.add(n) : e === "error" && u.add(n);
    },
    removeEventListener(e, n) {
      e === "message" ? i.delete(n) : e === "error" && u.delete(n);
    },
    get onmessage() {
      return b;
    },
    set onmessage(e) {
      b = e;
    },
    get onerror() {
      return t;
    },
    set onerror(e) {
      t = e;
    }
  };
}
function y(r, i) {
  return Q(new D(B(), {
    eval: !0,
    workerData: { __deepthoughtSource: r },
    ...i ? { name: i } : {}
  }));
}
function Y(r) {
  const i = r.host ?? "127.0.0.1", u = r.port ?? 0;
  let b = null, t = null;
  async function e(c) {
    const s = [];
    for await (const o of c) s.push(Buffer.isBuffer(o) ? o : Buffer.from(o));
    return Buffer.concat(s);
  }
  function n(c) {
    const s = {};
    for (const [o, a] of Object.entries(c))
      a != null && (s[o] = Array.isArray(a) ? a.join(", ") : a);
    return s;
  }
  async function d(c, s) {
    try {
      const o = new URL(c.url || "/", `http://${i}`), a = o.pathname.split("/").filter(Boolean);
      if (a[0] !== "__virtual__" || a.length < 3) {
        s.statusCode = 404, s.setHeader("Content-Type", "text/plain"), s.end("Not Found");
        return;
      }
      const x = a[1], w = Number(a[2]);
      if (!Number.isFinite(w)) {
        s.statusCode = 400, s.setHeader("Content-Type", "text/plain"), s.end("Invalid port");
        return;
      }
      const m = await e(c), V = m.byteLength > 0 ? m.buffer.slice(m.byteOffset, m.byteOffset + m.byteLength) : void 0, l = a.slice(3), E = (l.length ? `/${l.join("/")}` : "/") + o.search, L = await r.proxy.handleRequest(x, w, (c.method || "GET").toUpperCase(), E, n(c.headers), V);
      s.statusCode = L.statusCode;
      for (const [N, A] of Object.entries(L.headers))
        A != null && (Array.isArray(A), s.setHeader(N, A));
      const I = L.body ? Buffer.isBuffer(L.body) ? L.body : Buffer.from(L.body) : Buffer.alloc(0);
      s.end(I);
    } catch (o) {
      s.statusCode = 500, s.setHeader("Content-Type", "text/plain"), s.end(o instanceof Error ? o.message : String(o));
    }
  }
  return {
    kind: "local-http",
    get baseUrl() {
      return t;
    },
    async start() {
      if (b) return;
      b = z.createServer((s, o) => {
        d(s, o);
      }), await new Promise((s, o) => {
        b.once("error", o), b.listen(u, i, () => {
          b.off("error", o), s();
        });
      });
      const c = b.address();
      c && typeof c == "object" ? t = `http://${i}:${c.port}` : t = `http://${i}`, r.proxy.setBaseUrl(t);
    },
    async stop() {
      const c = b;
      b = null, t = null, c && await new Promise((s) => {
        c.close(() => s());
      });
    }
  };
}
var g = 2, P = 6048e5;
function j() {
  return process.env.DEEPTHOUGHT_CACHE || f(k(), "deepthought-snapshots");
}
function W(r, i) {
  const u = Z("sha256").update(i).digest("hex");
  return f(r, `${u}.bin`);
}
async function U(r = j()) {
  try {
    await q(r, { recursive: !0 });
  } catch {
    return null;
  }
  return (async () => {
    try {
      const i = await H(r), u = Date.now();
      for (const b of i)
        if (b.endsWith(".meta.json"))
          try {
            const t = await h(f(r, b), "utf8"), e = JSON.parse(t);
            if (e.schema !== g || e.createdAt != null && u - e.createdAt > P) {
              const n = b.slice(0, -10);
              await J(f(r, b)).catch(() => {
              }), await J(f(r, `${n}.bin`)).catch(() => {
              });
            }
          } catch {
          }
    } catch {
    }
  })(), {
    async get(i) {
      try {
        const u = W(r, i), b = u.replace(/\.bin$/, ".meta.json"), t = await h(b, "utf8"), e = JSON.parse(t);
        if (e.schema !== g || e.createdAt != null && Date.now() - e.createdAt > P) return null;
        const n = await h(u);
        if (n.byteLength < 4) return null;
        const d = n.readUInt32LE(0), c = n.subarray(4, 4 + d), s = n.buffer.slice(n.byteOffset + 4 + d, n.byteOffset + n.byteLength);
        return {
          manifest: JSON.parse(c.toString("utf8")),
          data: s
        };
      } catch {
        return null;
      }
    },
    async set(i, u) {
      const b = W(r, i), t = b.replace(/\.bin$/, ".meta.json"), e = Buffer.from(JSON.stringify(u.manifest), "utf8"), n = Buffer.from(u.data), d = Buffer.alloc(4);
      d.writeUInt32LE(e.byteLength, 0), await S(b, Buffer.concat([
        d,
        e,
        n
      ])), await S(t, JSON.stringify({
        schema: g,
        createdAt: Date.now()
      }));
    },
    close() {
    }
  };
}
function G() {
  try {
    const r = M(O(import.meta.url)), i = [
      f(r, "..", "..", "__worker__.js"),
      f(r, "..", "..", "..", "dist", "__worker__.js"),
      f(process.cwd(), "dist", "__worker__.js")
    ];
    for (const u of i) if (C(u)) return u;
  } catch {
  }
  return null;
}
function R() {
  const r = Buffer.from(T, "base64");
  return p(r, { to: "string" });
}
function K(r, i) {
  return !i && r && C(r) ? v(r, "utf8") : r && C(r) ? v(r, "utf8") : R();
}
function _(r = {}) {
  let i = r.workerPath ?? G(), u = null;
  function b(t) {
    if (!t && u) return u;
    const e = K(i, !!t);
    return t || (u = e), e;
  }
  return {
    kind: "node",
    defaultHeadless: !0,
    canCreateWorkers() {
      return !0;
    },
    createWorker(t) {
      if (t.type === "url") {
        let d = t.url;
        if (d.startsWith("file:") && (d = O(d)), !C(d)) throw new Error(`[DeepThoughtEngine] Node host cannot load worker URL: ${t.url}`);
        const c = v(d, "utf8"), s = y(c, t.name);
        return X(s, !0), s;
      }
      if (t.type === "source") return y(t.source, t.name);
      const e = b(t.embedded), n = y(e, t.name);
      return i && !t.embedded && X(n, !0), n;
    },
    async probeProcessWorkerUrl(t) {
      if (t) {
        let n = t;
        return n.startsWith("file:") && (n = O(n)), C(n) ? (i = n, u = null, n) : null;
      }
      const e = G();
      return e ? (i = e, u = null, e) : null;
    },
    disposeGlobalResources() {
      u = null;
    },
    async openSnapshotCache(t) {
      return t.enableSnapshotCache === !1 || t.packageStore === "memory" ? null : U(r.cacheDir);
    },
    createHttpIngress({ proxy: t, headless: e }) {
      return e ? Y({
        proxy: t,
        host: r.httpHost,
        port: r.httpPort
      }) : {
        kind: "programmatic",
        baseUrl: null
      };
    }
  };
}
F(_());
export {
  fe as DeepThoughtEngine,
  re as DeepThoughtFS,
  ae as DeepThoughtFSClient,
  Le as DeepThoughtFSClientError,
  ue as DeepThoughtProcess,
  te as DeepThoughtSWSetupError,
  ie as DependencyInstaller,
  re as LabFS,
  ae as LabFSClient,
  Le as LabFSClientError,
  ue as LabProcess,
  fe as LabRuntime,
  ce as MemoryVolume,
  me as RequestProxy,
  Y as createLocalHttpIngress,
  _ as createNodeHost,
  de as discoverWorkspaces,
  be as getProxyInstance,
  he as getRuntimeHost,
  oe as install,
  U as openFsSnapshotCache,
  se as readWorkspacePatterns,
  ne as resetProxy,
  ye as resetRuntimeHost,
  F as setRuntimeHost
};

//# sourceMappingURL=headless.mjs.map