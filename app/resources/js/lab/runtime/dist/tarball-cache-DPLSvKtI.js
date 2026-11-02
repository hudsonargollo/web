import { n as Ft } from "./rolldown-runtime-DpiKQypI.js";
import { b as Rt, d as Nt, l as $t, x as Vt } from "./lab-keys-CG3byUca.js";
import { t as _t } from "./lab-idb-Cb1nrW1R.js";
var Ke = /* @__PURE__ */ Ft({
  basename: () => P,
  default: () => Kt,
  delimiter: () => ":",
  dirname: () => X,
  extname: () => J,
  format: () => ct,
  isAbsolute: () => q,
  join: () => st,
  normalize: () => $,
  parse: () => it,
  posix: () => Ht,
  relative: () => ot,
  resolve: () => K,
  sep: () => "/",
  win32: () => Mt
});
function $(t) {
  if (!t) return ".";
  const e = t.charAt(0) === "/", n = t.split("/").filter((s) => s.length > 0), r = [];
  for (const s of n) s === ".." ? r.length > 0 && r[r.length - 1] !== ".." ? r.pop() : e || r.push("..") : s !== "." && r.push(s);
  let o = r.join("/");
  return e && (o = "/" + o), o || ".";
}
function st(...t) {
  return t.length === 0 ? "." : $(t.filter((e) => e !== "").join("/"));
}
var Lt = /^[a-z][a-z0-9+\-.]*:/i;
function zt(t) {
  if (!Lt.test(t)) return t;
  try {
    const e = new globalThis.URL(t);
    if (e.protocol === "file:" || e.protocol === "http:" || e.protocol === "https:") return decodeURIComponent(e.pathname) || t;
  } catch {
  }
  return t;
}
function K(...t) {
  let e = "";
  for (let n = t.length - 1; n >= 0; n--) {
    const r = t[n];
    if (r && (e = zt(r) + (e ? "/" + e : ""), e.charAt(0) === "/"))
      break;
  }
  return e.charAt(0) !== "/" && (e = (typeof globalThis < "u" && globalThis.process && typeof globalThis.process.cwd == "function" ? globalThis.process.cwd() : "/") + (e ? "/" + e : "")), $(e);
}
function q(t) {
  if (!t) return !1;
  if (t.charAt(0) === "/") return !0;
  if (Lt.test(t)) try {
    const e = new globalThis.URL(t);
    if (e.protocol === "file:" || e.protocol === "http:" || e.protocol === "https:") return !0;
  } catch {
  }
  return !1;
}
function X(t) {
  const e = t ? t.length : 0;
  if (e === 0) return ".";
  const n = t.charAt(0) === "/";
  let r = -1, o = !0;
  for (let s = e - 1; s >= 1; s--) if (t.charAt(s) === "/") {
    if (!o) {
      r = s;
      break;
    }
  } else o = !1;
  return r === -1 ? n ? "/" : "." : n && r === 0 ? "/" : t.substring(0, r);
}
function P(t, e) {
  const n = t ? t.length : 0;
  if (n === 0) return "";
  let r = n;
  for (; r > 0 && t.charAt(r - 1) === "/"; ) r--;
  if (r === 0) return "";
  let o = 0;
  for (let i = r - 1; i >= 0; i--) if (t.charAt(i) === "/") {
    o = i + 1;
    break;
  }
  let s = t.substring(o, r);
  return e && s.endsWith(e) && s.length > e.length && (s = s.substring(0, s.length - e.length)), s;
}
function J(t) {
  const e = P(t), n = e.lastIndexOf(".");
  return n <= 0 ? "" : e.substring(n);
}
function ot(t, e) {
  const n = K(t), r = K(e);
  if (n === r) return "";
  const o = n.split("/").filter(Boolean), s = r.split("/").filter(Boolean);
  let i = 0;
  const a = Math.min(o.length, s.length);
  for (; i < a && o[i] === s[i]; ) i++;
  const l = o.length - i, h = s.slice(i), c = [];
  for (let d = 0; d < l; d++) c.push("..");
  return c.push(...h), c.join("/") || ".";
}
function it(t) {
  const e = $(t), n = q(e), r = X(e), o = P(e), s = J(e), i = o.substring(0, o.length - s.length);
  return {
    root: n ? "/" : "",
    dir: r,
    base: o,
    ext: s,
    name: i
  };
}
function ct(t) {
  const e = t.dir || t.root || "", n = t.base || (t.name || "") + (t.ext || "");
  return e ? e === t.root ? e + n : e + "/" + n : n;
}
var Ht = {
  sep: "/",
  delimiter: ":",
  normalize: $,
  join: st,
  resolve: K,
  isAbsolute: q,
  dirname: X,
  basename: P,
  extname: J,
  relative: ot,
  parse: it,
  format: ct
}, Mt = {
  sep: "\\",
  delimiter: ";",
  normalize: $,
  join: st,
  resolve: K,
  isAbsolute: q,
  dirname: X,
  basename: P,
  extname: J,
  relative: ot,
  parse: it,
  format: ct
}, Kt = {
  sep: "/",
  delimiter: ":",
  normalize: $,
  join: st,
  resolve: K,
  isAbsolute: q,
  dirname: X,
  basename: P,
  extname: J,
  relative: ot,
  parse: it,
  format: ct,
  posix: Ht,
  win32: Mt
}, Pt = Nt, Yt = Vt, k = "wasmModules", qt = 1, At = 32, Dt = 2592e6;
function Q(t) {
  let e = 2166136261, n = 3421674724;
  for (let r = 0; r < t.length; r++) {
    const o = t[r];
    e = Math.imul(e ^ o, 16777619) >>> 0, n = Math.imul(n ^ o, 16777623) >>> 0;
  }
  return `${e.toString(16)}-${n.toString(16)}-${t.length.toString(16)}`;
}
async function Ct(t) {
  try {
    const e = globalThis.crypto?.subtle;
    if (e) {
      const n = t.buffer.slice(t.byteOffset, t.byteOffset + t.byteLength), r = await e.digest("SHA-256", n);
      return Array.from(new Uint8Array(r)).map((o) => o.toString(16).padStart(2, "0")).join("");
    }
  } catch {
  }
  return "fnv:" + Q(t);
}
function Xt() {
  return _t(Pt, Yt, qt, k);
}
function Jt(t, e) {
  return new Promise((n, r) => {
    try {
      const o = t.transaction(k, "readonly").objectStore(k).get(e);
      o.onsuccess = () => n(o.result ?? null), o.onerror = () => r(o.error);
    } catch (o) {
      r(o);
    }
  });
}
function Qt(t, e, n) {
  return new Promise((r, o) => {
    try {
      const s = t.transaction(k, "readwrite");
      s.objectStore(k).put(n, e), s.oncomplete = () => r(), s.onerror = () => o(s.error);
    } catch (s) {
      o(s);
    }
  });
}
function Zt(t) {
  return new Promise((e) => {
    try {
      const n = t.transaction(k, "readwrite"), r = n.objectStore(k).openCursor(), o = Date.now(), s = [];
      r.onsuccess = () => {
        const i = r.result;
        if (i) {
          const a = i.value;
          !a?.storedAt || o - a.storedAt > Dt ? i.delete() : s.push({
            key: i.key,
            storedAt: a.storedAt
          }), i.continue();
          return;
        }
        if (s.length > At) {
          s.sort((l, h) => l.storedAt - h.storedAt);
          const a = t.transaction(k, "readwrite").objectStore(k);
          for (const l of s.slice(0, s.length - At)) a.delete(l.key);
        }
        e();
      }, r.onerror = () => e(), n.onerror = () => e();
    } catch {
      e();
    }
  });
}
async function te() {
  const t = await Xt();
  if (!t) return null;
  let e = !0;
  return {
    async get(n) {
      try {
        const r = await Jt(t, n);
        return !r?.module || Date.now() - r.storedAt > Dt || typeof WebAssembly < "u" && !(r.module instanceof WebAssembly.Module) ? null : r.module;
      } catch {
        return null;
      }
    },
    async put(n, r) {
      if (e)
        try {
          await Qt(t, n, {
            module: r,
            storedAt: Date.now()
          }), Zt(t).catch(() => {
          });
        } catch (o) {
          o?.name === "DataCloneError" && (e = !1);
        }
    },
    close() {
      try {
        t.close();
      } catch {
      }
    }
  };
}
var lt = null;
function kt() {
  return lt || (lt = te()), lt;
}
var Pe = 4194304, v = /* @__PURE__ */ new Map(), ee = 67108864;
function bt() {
  let t = 0;
  for (const e of v.values()) t += e.sourceBytes;
  for (; t > ee && v.size > 1; ) {
    const e = v.keys().next().value;
    if (!e) break;
    const n = v.get(e);
    v.delete(e), t -= n.sourceBytes;
  }
}
function ne(t) {
  return t.byteLength;
}
function pt(t) {
  return t instanceof ArrayBuffer ? new Uint8Array(t) : new Uint8Array(t.buffer, t.byteOffset, t.byteLength);
}
function re(t) {
  return t instanceof ArrayBuffer ? t : t.buffer.slice(t.byteOffset, t.byteOffset + t.byteLength);
}
function gt(t, e) {
  Ct(t).then(async (n) => {
    const r = await kt();
    r && await r.put(n, e);
  }).catch(() => {
  });
}
async function Tt(t) {
  try {
    const e = await kt();
    return e ? await e.get(await Ct(t)) : null;
  } catch {
    return null;
  }
}
function Ye(t, e) {
  const n = Q(t);
  v.set(n, {
    promise: Promise.resolve(e),
    module: e,
    sourceBytes: t.byteLength
  }), bt(), gt(t, e);
}
function qe(t) {
  if (typeof WebAssembly > "u" || ne(t) < 4194304) return;
  const e = pt(t), n = Q(e);
  if (v.has(n)) return;
  const r = e.slice(), o = {
    promise: (async () => {
      const s = await Tt(r);
      if (s) return s;
      const i = await WebAssembly.compile(r);
      return gt(r, i), i;
    })(),
    module: null,
    sourceBytes: r.byteLength
  };
  o.promise.then((s) => {
    o.module = s;
  }, () => {
    v.delete(n);
  }), v.set(n, o), bt();
}
function Xe(t) {
  const e = v.get(Q(pt(t)));
  return e?.module ? e.module : null;
}
var F = null, se = 1, N = /* @__PURE__ */ new Map();
function oe() {
  if (F) return F;
  const t = URL.createObjectURL(new Blob([`
    self.onmessage = function(e) {
      try {
        var mod = new WebAssembly.Module(e.data.bytes);
        self.postMessage({ id: e.data.id, ok: true, module: mod });
      } catch (err) {
        self.postMessage({ id: e.data.id, ok: false, error: err.message });
      }
    };
  `], { type: "application/javascript" })), e = new Worker(t);
  return URL.revokeObjectURL(t), e.onmessage = (n) => {
    const { id: r, ok: o, module: s, error: i } = n.data, a = N.get(r);
    a && (N.delete(r), o ? a.resolve(s) : a.reject(new Error(i)));
  }, e.onerror = (n) => {
    const r = new Error(n.message || "Worker compilation failed");
    for (const o of N.values()) o.reject(r);
    N.clear(), e.terminate(), F === e && (F = null);
  }, F = e, e;
}
function Je(t) {
  const e = pt(t), n = Q(e), r = v.get(n);
  if (r?.module) return Promise.resolve(r.module);
  const o = e.slice(), s = (async () => {
    const a = await Tt(o);
    if (a) return a;
    const l = await new Promise((h, c) => {
      try {
        const d = oe(), b = se++;
        N.set(b, {
          resolve: h,
          reject: c
        });
        const p = re(o.slice());
        d.postMessage({
          id: b,
          bytes: p
        }, [p]);
      } catch {
        WebAssembly.compile(o).then(h, c);
      }
    });
    return gt(o, l), l;
  })(), i = {
    promise: s,
    module: null,
    sourceBytes: o.byteLength
  };
  return s.then((a) => {
    i.module = a;
  }, () => {
    v.delete(n);
  }), v.set(n, i), bt(), s;
}
function Qe() {
  let t = 0;
  for (const e of v.values()) e.module || t++;
  return {
    entries: v.size,
    pending: t
  };
}
function Ze() {
  for (const [t, e] of v) e.module && v.delete(t);
}
function tn() {
  v.clear();
  for (const t of N.values()) t.reject(/* @__PURE__ */ new Error("DeepThoughtEngine runtime disposed"));
  if (N.clear(), F) {
    try {
      F.terminate();
    } catch {
    }
    F = null;
  }
}
function ie(t) {
  return t instanceof Uint8Array || ArrayBuffer.isView(t) && t.constructor.name === "Uint8Array";
}
function yt(t) {
  if (!Number.isSafeInteger(t) || t < 0) throw new Error("positive integer expected, got " + t);
}
function at(t, ...e) {
  if (!ie(t)) throw new Error("Uint8Array expected");
  if (e.length > 0 && !e.includes(t.length)) throw new Error("Uint8Array expected of length " + e + ", got length=" + t.length);
}
function en(t) {
  if (typeof t != "function" || typeof t.create != "function") throw new Error("Hash should be wrapped by utils.createHasher");
  yt(t.outputLen), yt(t.blockLen);
}
function mt(t, e = !0) {
  if (t.destroyed) throw new Error("Hash instance has been destroyed");
  if (e && t.finished) throw new Error("Hash#digest() has already been called");
}
function ce(t, e) {
  at(t);
  const n = e.outputLen;
  if (t.length < n) throw new Error("digestInto() expects output buffer of length at least " + n);
}
function nn(t) {
  return new Uint32Array(t.buffer, t.byteOffset, Math.floor(t.byteLength / 4));
}
function Y(...t) {
  for (let e = 0; e < t.length; e++) t[e].fill(0);
}
function ft(t) {
  return new DataView(t.buffer, t.byteOffset, t.byteLength);
}
function M(t, e) {
  return t << 32 - e | t >>> e;
}
function rn(t, e) {
  return t << e | t >>> 32 - e >>> 0;
}
var ae = new Uint8Array(new Uint32Array([287454020]).buffer)[0] === 68;
function le(t) {
  return t << 24 & 4278190080 | t << 8 & 16711680 | t >>> 8 & 65280 | t >>> 24 & 255;
}
function fe(t) {
  for (let e = 0; e < t.length; e++) t[e] = le(t[e]);
  return t;
}
var sn = ae ? (t) => t : fe;
function Wt(t) {
  if (typeof t != "string") throw new Error("string expected");
  return new Uint8Array(new TextEncoder().encode(t));
}
function It(t) {
  return typeof t == "string" && (t = Wt(t)), at(t), t;
}
function on(t) {
  return typeof t == "string" && (t = Wt(t)), at(t), t;
}
function cn(t, e) {
  if (e !== void 0 && {}.toString.call(e) !== "[object Object]") throw new Error("options should be object or undefined");
  return Object.assign(t, e);
}
var he = class {
};
function wt(t) {
  const e = (r) => t().update(It(r)).digest(), n = t();
  return e.outputLen = n.outputLen, e.blockLen = n.blockLen, e.create = () => t(), e;
}
function ue(t, e, n, r) {
  if (typeof t.setBigUint64 == "function") return t.setBigUint64(e, n, r);
  const o = BigInt(32), s = BigInt(4294967295), i = Number(n >> o & s), a = Number(n & s), l = r ? 4 : 0, h = r ? 0 : 4;
  t.setUint32(e + l, i, r), t.setUint32(e + h, a, r);
}
function de(t, e, n) {
  return t & e ^ ~t & n;
}
function be(t, e, n) {
  return t & e ^ t & n ^ e & n;
}
var Gt = class extends he {
  constructor(t, e, n, r) {
    super(), this.finished = !1, this.length = 0, this.pos = 0, this.destroyed = !1, this.blockLen = t, this.outputLen = e, this.padOffset = n, this.isLE = r, this.buffer = new Uint8Array(t), this.view = ft(this.buffer);
  }
  update(t) {
    mt(this), t = It(t), at(t);
    const { view: e, buffer: n, blockLen: r } = this, o = t.length;
    for (let s = 0; s < o; ) {
      const i = Math.min(r - this.pos, o - s);
      if (i === r) {
        const a = ft(t);
        for (; r <= o - s; s += r) this.process(a, s);
        continue;
      }
      n.set(t.subarray(s, s + i), this.pos), this.pos += i, s += i, this.pos === r && (this.process(e, 0), this.pos = 0);
    }
    return this.length += t.length, this.roundClean(), this;
  }
  digestInto(t) {
    mt(this), ce(t, this), this.finished = !0;
    const { buffer: e, view: n, blockLen: r, isLE: o } = this;
    let { pos: s } = this;
    e[s++] = 128, Y(this.buffer.subarray(s)), this.padOffset > r - s && (this.process(n, 0), s = 0);
    for (let c = s; c < r; c++) e[c] = 0;
    ue(n, r - 8, BigInt(this.length * 8), o), this.process(n, 0);
    const i = ft(t), a = this.outputLen;
    if (a % 4) throw new Error("_sha2: outputLen should be aligned to 32bit");
    const l = a / 4, h = this.get();
    if (l > h.length) throw new Error("_sha2: outputLen bigger than state");
    for (let c = 0; c < l; c++) i.setUint32(4 * c, h[c], o);
  }
  digest() {
    const { buffer: t, outputLen: e } = this;
    this.digestInto(t);
    const n = t.slice(0, e);
    return this.destroy(), n;
  }
  _cloneInto(t) {
    t || (t = new this.constructor()), t.set(...this.get());
    const { blockLen: e, buffer: n, length: r, finished: o, destroyed: s, pos: i } = this;
    return t.destroyed = s, t.finished = o, t.length = r, t.pos = i, r % e && t.buffer.set(n), t;
  }
  clone() {
    return this._cloneInto();
  }
}, I = /* @__PURE__ */ Uint32Array.from([
  1779033703,
  3144134277,
  1013904242,
  2773480762,
  1359893119,
  2600822924,
  528734635,
  1541459225
]), S = /* @__PURE__ */ Uint32Array.from([
  3418070365,
  3238371032,
  1654270250,
  914150663,
  2438529370,
  812702999,
  355462360,
  4144912697,
  1731405415,
  4290775857,
  2394180231,
  1750603025,
  3675008525,
  1694076839,
  1203062813,
  3204075428
]), E = /* @__PURE__ */ Uint32Array.from([
  1779033703,
  4089235720,
  3144134277,
  2227873595,
  1013904242,
  4271175723,
  2773480762,
  1595750129,
  1359893119,
  2917565137,
  2600822924,
  725511199,
  528734635,
  4215389547,
  1541459225,
  327033209
]), et = /* @__PURE__ */ BigInt(2 ** 32 - 1), xt = /* @__PURE__ */ BigInt(32);
function pe(t, e = !1) {
  return e ? {
    h: Number(t & et),
    l: Number(t >> xt & et)
  } : {
    h: Number(t >> xt & et) | 0,
    l: Number(t & et) | 0
  };
}
function ge(t, e = !1) {
  const n = t.length;
  let r = new Uint32Array(n), o = new Uint32Array(n);
  for (let s = 0; s < n; s++) {
    const { h: i, l: a } = pe(t[s], e);
    [r[s], o[s]] = [i, a];
  }
  return [r, o];
}
var Ut = (t, e, n) => t >>> n, vt = (t, e, n) => t << 32 - n | e >>> n, V = (t, e, n) => t >>> n | e << 32 - n, z = (t, e, n) => t << 32 - n | e >>> n, nt = (t, e, n) => t << 64 - n | e >>> n - 32, rt = (t, e, n) => t >>> n - 32 | e << 64 - n;
function C(t, e, n, r) {
  const o = (e >>> 0) + (r >>> 0);
  return {
    h: t + n + (o / 2 ** 32 | 0) | 0,
    l: o | 0
  };
}
var we = (t, e, n) => (t >>> 0) + (e >>> 0) + (n >>> 0), Ae = (t, e, n, r) => e + n + r + (t / 2 ** 32 | 0) | 0, ye = (t, e, n, r) => (t >>> 0) + (e >>> 0) + (n >>> 0) + (r >>> 0), me = (t, e, n, r, o) => e + n + r + o + (t / 2 ** 32 | 0) | 0, xe = (t, e, n, r, o) => (t >>> 0) + (e >>> 0) + (n >>> 0) + (r >>> 0) + (o >>> 0), Ue = (t, e, n, r, o, s) => e + n + r + o + s + (t / 2 ** 32 | 0) | 0, ve = /* @__PURE__ */ Uint32Array.from([
  1116352408,
  1899447441,
  3049323471,
  3921009573,
  961987163,
  1508970993,
  2453635748,
  2870763221,
  3624381080,
  310598401,
  607225278,
  1426881987,
  1925078388,
  2162078206,
  2614888103,
  3248222580,
  3835390401,
  4022224774,
  264347078,
  604807628,
  770255983,
  1249150122,
  1555081692,
  1996064986,
  2554220882,
  2821834349,
  2952996808,
  3210313671,
  3336571891,
  3584528711,
  113926993,
  338241895,
  666307205,
  773529912,
  1294757372,
  1396182291,
  1695183700,
  1986661051,
  2177026350,
  2456956037,
  2730485921,
  2820302411,
  3259730800,
  3345764771,
  3516065817,
  3600352804,
  4094571909,
  275423344,
  430227734,
  506948616,
  659060556,
  883997877,
  958139571,
  1322822218,
  1537002063,
  1747873779,
  1955562222,
  2024104815,
  2227730452,
  2361852424,
  2428436474,
  2756734187,
  3204031479,
  3329325298
]), G = /* @__PURE__ */ new Uint32Array(64), Se = class extends Gt {
  constructor(t = 32) {
    super(64, t, 8, !1), this.A = I[0] | 0, this.B = I[1] | 0, this.C = I[2] | 0, this.D = I[3] | 0, this.E = I[4] | 0, this.F = I[5] | 0, this.G = I[6] | 0, this.H = I[7] | 0;
  }
  get() {
    const { A: t, B: e, C: n, D: r, E: o, F: s, G: i, H: a } = this;
    return [
      t,
      e,
      n,
      r,
      o,
      s,
      i,
      a
    ];
  }
  set(t, e, n, r, o, s, i, a) {
    this.A = t | 0, this.B = e | 0, this.C = n | 0, this.D = r | 0, this.E = o | 0, this.F = s | 0, this.G = i | 0, this.H = a | 0;
  }
  process(t, e) {
    for (let c = 0; c < 16; c++, e += 4) G[c] = t.getUint32(e, !1);
    for (let c = 16; c < 64; c++) {
      const d = G[c - 15], b = G[c - 2], p = M(d, 7) ^ M(d, 18) ^ d >>> 3, w = M(b, 17) ^ M(b, 19) ^ b >>> 10;
      G[c] = w + G[c - 7] + p + G[c - 16] | 0;
    }
    let { A: n, B: r, C: o, D: s, E: i, F: a, G: l, H: h } = this;
    for (let c = 0; c < 64; c++) {
      const d = M(i, 6) ^ M(i, 11) ^ M(i, 25), b = h + d + de(i, a, l) + ve[c] + G[c] | 0, p = (M(n, 2) ^ M(n, 13) ^ M(n, 22)) + be(n, r, o) | 0;
      h = l, l = a, a = i, i = s + b | 0, s = o, o = r, r = n, n = b + p | 0;
    }
    n = n + this.A | 0, r = r + this.B | 0, o = o + this.C | 0, s = s + this.D | 0, i = i + this.E | 0, a = a + this.F | 0, l = l + this.G | 0, h = h + this.H | 0, this.set(n, r, o, s, i, a, l, h);
  }
  roundClean() {
    Y(G);
  }
  destroy() {
    this.set(0, 0, 0, 0, 0, 0, 0, 0), Y(this.buffer);
  }
}, jt = ge([
  "0x428a2f98d728ae22",
  "0x7137449123ef65cd",
  "0xb5c0fbcfec4d3b2f",
  "0xe9b5dba58189dbbc",
  "0x3956c25bf348b538",
  "0x59f111f1b605d019",
  "0x923f82a4af194f9b",
  "0xab1c5ed5da6d8118",
  "0xd807aa98a3030242",
  "0x12835b0145706fbe",
  "0x243185be4ee4b28c",
  "0x550c7dc3d5ffb4e2",
  "0x72be5d74f27b896f",
  "0x80deb1fe3b1696b1",
  "0x9bdc06a725c71235",
  "0xc19bf174cf692694",
  "0xe49b69c19ef14ad2",
  "0xefbe4786384f25e3",
  "0x0fc19dc68b8cd5b5",
  "0x240ca1cc77ac9c65",
  "0x2de92c6f592b0275",
  "0x4a7484aa6ea6e483",
  "0x5cb0a9dcbd41fbd4",
  "0x76f988da831153b5",
  "0x983e5152ee66dfab",
  "0xa831c66d2db43210",
  "0xb00327c898fb213f",
  "0xbf597fc7beef0ee4",
  "0xc6e00bf33da88fc2",
  "0xd5a79147930aa725",
  "0x06ca6351e003826f",
  "0x142929670a0e6e70",
  "0x27b70a8546d22ffc",
  "0x2e1b21385c26c926",
  "0x4d2c6dfc5ac42aed",
  "0x53380d139d95b3df",
  "0x650a73548baf63de",
  "0x766a0abb3c77b2a8",
  "0x81c2c92e47edaee6",
  "0x92722c851482353b",
  "0xa2bfe8a14cf10364",
  "0xa81a664bbc423001",
  "0xc24b8b70d0f89791",
  "0xc76c51a30654be30",
  "0xd192e819d6ef5218",
  "0xd69906245565a910",
  "0xf40e35855771202a",
  "0x106aa07032bbd1b8",
  "0x19a4c116b8d2d0c8",
  "0x1e376c085141ab53",
  "0x2748774cdf8eeb99",
  "0x34b0bcb5e19b48a8",
  "0x391c0cb3c5c95a63",
  "0x4ed8aa4ae3418acb",
  "0x5b9cca4f7763e373",
  "0x682e6ff3d6b2b8a3",
  "0x748f82ee5defb2fc",
  "0x78a5636f43172f60",
  "0x84c87814a1f0ab72",
  "0x8cc702081a6439ec",
  "0x90befffa23631e28",
  "0xa4506cebde82bde9",
  "0xbef9a3f7b2c67915",
  "0xc67178f2e372532b",
  "0xca273eceea26619c",
  "0xd186b8c721c0c207",
  "0xeada7dd6cde0eb1e",
  "0xf57d4f7fee6ed178",
  "0x06f067aa72176fba",
  "0x0a637dc5a2c898a6",
  "0x113f9804bef90dae",
  "0x1b710b35131c471b",
  "0x28db77f523047d84",
  "0x32caab7b40c72493",
  "0x3c9ebe0a15c9bebc",
  "0x431d67c49c100d4c",
  "0x4cc5d4becb3e42b6",
  "0x597f299cfc657e2a",
  "0x5fcb6fab3ad6faec",
  "0x6c44198c4a475817"
].map((t) => BigInt(t))), Ee = jt[0], Be = jt[1], j = /* @__PURE__ */ new Uint32Array(80), O = /* @__PURE__ */ new Uint32Array(80), Ot = class extends Gt {
  constructor(t = 64) {
    super(128, t, 16, !1), this.Ah = E[0] | 0, this.Al = E[1] | 0, this.Bh = E[2] | 0, this.Bl = E[3] | 0, this.Ch = E[4] | 0, this.Cl = E[5] | 0, this.Dh = E[6] | 0, this.Dl = E[7] | 0, this.Eh = E[8] | 0, this.El = E[9] | 0, this.Fh = E[10] | 0, this.Fl = E[11] | 0, this.Gh = E[12] | 0, this.Gl = E[13] | 0, this.Hh = E[14] | 0, this.Hl = E[15] | 0;
  }
  get() {
    const { Ah: t, Al: e, Bh: n, Bl: r, Ch: o, Cl: s, Dh: i, Dl: a, Eh: l, El: h, Fh: c, Fl: d, Gh: b, Gl: p, Hh: w, Hl: y } = this;
    return [
      t,
      e,
      n,
      r,
      o,
      s,
      i,
      a,
      l,
      h,
      c,
      d,
      b,
      p,
      w,
      y
    ];
  }
  set(t, e, n, r, o, s, i, a, l, h, c, d, b, p, w, y) {
    this.Ah = t | 0, this.Al = e | 0, this.Bh = n | 0, this.Bl = r | 0, this.Ch = o | 0, this.Cl = s | 0, this.Dh = i | 0, this.Dl = a | 0, this.Eh = l | 0, this.El = h | 0, this.Fh = c | 0, this.Fl = d | 0, this.Gh = b | 0, this.Gl = p | 0, this.Hh = w | 0, this.Hl = y | 0;
  }
  process(t, e) {
    for (let u = 0; u < 16; u++, e += 4)
      j[u] = t.getUint32(e), O[u] = t.getUint32(e += 4);
    for (let u = 16; u < 80; u++) {
      const f = j[u - 15] | 0, A = O[u - 15] | 0, U = V(f, A, 1) ^ V(f, A, 8) ^ Ut(f, A, 7), B = z(f, A, 1) ^ z(f, A, 8) ^ vt(f, A, 7), _ = j[u - 2] | 0, L = O[u - 2] | 0, T = V(_, L, 19) ^ nt(_, L, 61) ^ Ut(_, L, 6), x = z(_, L, 19) ^ rt(_, L, 61) ^ vt(_, L, 6), W = ye(B, x, O[u - 7], O[u - 16]), R = me(W, U, T, j[u - 7], j[u - 16]);
      j[u] = R | 0, O[u] = W | 0;
    }
    let { Ah: n, Al: r, Bh: o, Bl: s, Ch: i, Cl: a, Dh: l, Dl: h, Eh: c, El: d, Fh: b, Fl: p, Gh: w, Gl: y, Hh: g, Hl: m } = this;
    for (let u = 0; u < 80; u++) {
      const f = V(c, d, 14) ^ V(c, d, 18) ^ nt(c, d, 41), A = z(c, d, 14) ^ z(c, d, 18) ^ rt(c, d, 41), U = c & b ^ ~c & w, B = d & p ^ ~d & y, _ = xe(m, A, B, Be[u], O[u]), L = Ue(_, g, f, U, Ee[u], j[u]), T = _ | 0, x = V(n, r, 28) ^ nt(n, r, 34) ^ nt(n, r, 39), W = z(n, r, 28) ^ rt(n, r, 34) ^ rt(n, r, 39), R = n & o ^ n & i ^ o & i, Z = r & s ^ r & a ^ s & a;
      g = w | 0, m = y | 0, w = b | 0, y = p | 0, b = c | 0, p = d | 0, { h: c, l: d } = C(l | 0, h | 0, L | 0, T | 0), l = i | 0, h = a | 0, i = o | 0, a = s | 0, o = n | 0, s = r | 0;
      const tt = we(T, W, Z);
      n = Ae(tt, L, x, R), r = tt | 0;
    }
    ({ h: n, l: r } = C(this.Ah | 0, this.Al | 0, n | 0, r | 0)), { h: o, l: s } = C(this.Bh | 0, this.Bl | 0, o | 0, s | 0), { h: i, l: a } = C(this.Ch | 0, this.Cl | 0, i | 0, a | 0), { h: l, l: h } = C(this.Dh | 0, this.Dl | 0, l | 0, h | 0), { h: c, l: d } = C(this.Eh | 0, this.El | 0, c | 0, d | 0), { h: b, l: p } = C(this.Fh | 0, this.Fl | 0, b | 0, p | 0), { h: w, l: y } = C(this.Gh | 0, this.Gl | 0, w | 0, y | 0), { h: g, l: m } = C(this.Hh | 0, this.Hl | 0, g | 0, m | 0), this.set(n, r, o, s, i, a, l, h, c, d, b, p, w, y, g, m);
  }
  roundClean() {
    Y(j, O);
  }
  destroy() {
    Y(this.buffer), this.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
  }
}, _e = class extends Ot {
  constructor() {
    super(48), this.Ah = S[0] | 0, this.Al = S[1] | 0, this.Bh = S[2] | 0, this.Bl = S[3] | 0, this.Ch = S[4] | 0, this.Cl = S[5] | 0, this.Dh = S[6] | 0, this.Dl = S[7] | 0, this.Eh = S[8] | 0, this.El = S[9] | 0, this.Fh = S[10] | 0, this.Fl = S[11] | 0, this.Gh = S[12] | 0, this.Gl = S[13] | 0, this.Hh = S[14] | 0, this.Hl = S[15] | 0;
  }
}, an = /* @__PURE__ */ wt(() => new Se()), Le = /* @__PURE__ */ wt(() => new Ot()), He = /* @__PURE__ */ wt(() => new _e()), Me = Le, De = He;
function D(t, e) {
  return t >>> e | t << 32 - e;
}
function ht(t, e) {
  return t << e | t >>> 32 - e;
}
function Ce(t) {
  const e = new Uint32Array([
    1116352408,
    1899447441,
    3049323471,
    3921009573,
    961987163,
    1508970993,
    2453635748,
    2870763221,
    3624381080,
    310598401,
    607225278,
    1426881987,
    1925078388,
    2162078206,
    2614888103,
    3248222580,
    3835390401,
    4022224774,
    264347078,
    604807628,
    770255983,
    1249150122,
    1555081692,
    1996064986,
    2554220882,
    2821834349,
    2952996808,
    3210313671,
    3336571891,
    3584528711,
    113926993,
    338241895,
    666307205,
    773529912,
    1294757372,
    1396182291,
    1695183700,
    1986661051,
    2177026350,
    2456956037,
    2730485921,
    2820302411,
    3259730800,
    3345764771,
    3516065817,
    3600352804,
    4094571909,
    275423344,
    430227734,
    506948616,
    659060556,
    883997877,
    958139571,
    1322822218,
    1537002063,
    1747873779,
    1955562222,
    2024104815,
    2227730452,
    2361852424,
    2428436474,
    2756734187,
    3204031479,
    3329325298
  ]);
  let n = 1779033703, r = 3144134277, o = 1013904242, s = 2773480762, i = 1359893119, a = 2600822924, l = 528734635, h = 1541459225;
  const c = t.length * 8, d = (56 - (t.length + 1) % 64 + 64) % 64, b = new Uint8Array(t.length + 1 + d + 8);
  b.set(t), b[t.length] = 128;
  const p = new DataView(b.buffer);
  p.setUint32(b.length - 4, c >>> 0, !1), p.setUint32(b.length - 8, Math.floor(c / 4294967296), !1);
  const w = /* @__PURE__ */ new Uint32Array(64);
  for (let m = 0; m < b.length; m += 64) {
    for (let x = 0; x < 16; x++) w[x] = p.getUint32(m + x * 4, !1);
    for (let x = 16; x < 64; x++) {
      const W = D(w[x - 15], 7) ^ D(w[x - 15], 18) ^ w[x - 15] >>> 3, R = D(w[x - 2], 17) ^ D(w[x - 2], 19) ^ w[x - 2] >>> 10;
      w[x] = w[x - 16] + W + w[x - 7] + R >>> 0;
    }
    let u = n, f = r, A = o, U = s, B = i, _ = a, L = l, T = h;
    for (let x = 0; x < 64; x++) {
      const W = D(B, 6) ^ D(B, 11) ^ D(B, 25), R = B & _ ^ ~B & L, Z = T + W + R + e[x] + w[x] >>> 0, tt = (D(u, 2) ^ D(u, 13) ^ D(u, 22)) + (u & f ^ u & A ^ f & A) >>> 0;
      T = L, L = _, _ = B, B = U + Z >>> 0, U = A, A = f, f = u, u = Z + tt >>> 0;
    }
    n = n + u >>> 0, r = r + f >>> 0, o = o + A >>> 0, s = s + U >>> 0, i = i + B >>> 0, a = a + _ >>> 0, l = l + L >>> 0, h = h + T >>> 0;
  }
  const y = /* @__PURE__ */ new Uint8Array(32), g = new DataView(y.buffer);
  return g.setUint32(0, n, !1), g.setUint32(4, r, !1), g.setUint32(8, o, !1), g.setUint32(12, s, !1), g.setUint32(16, i, !1), g.setUint32(20, a, !1), g.setUint32(24, l, !1), g.setUint32(28, h, !1), y;
}
function ke(t) {
  let e = 1732584193, n = 4023233417, r = 2562383102, o = 271733878, s = 3285377520;
  const i = t.length * 8, a = (56 - (t.length + 1) % 64 + 64) % 64, l = new Uint8Array(t.length + 1 + a + 8);
  l.set(t), l[t.length] = 128;
  const h = new DataView(l.buffer);
  h.setUint32(l.length - 4, i >>> 0, !1), h.setUint32(l.length - 8, Math.floor(i / 4294967296), !1);
  const c = /* @__PURE__ */ new Uint32Array(80);
  for (let p = 0; p < l.length; p += 64) {
    for (let f = 0; f < 16; f++) c[f] = h.getUint32(p + f * 4, !1);
    for (let f = 16; f < 80; f++) c[f] = ht(c[f - 3] ^ c[f - 8] ^ c[f - 14] ^ c[f - 16], 1);
    let w = e, y = n, g = r, m = o, u = s;
    for (let f = 0; f < 80; f++) {
      let A, U;
      f < 20 ? (A = y & g | ~y & m, U = 1518500249) : f < 40 ? (A = y ^ g ^ m, U = 1859775393) : f < 60 ? (A = y & g | y & m | g & m, U = 2400959708) : (A = y ^ g ^ m, U = 3395469782);
      const B = ht(w, 5) + A + u + U + c[f] >>> 0;
      u = m, m = g, g = ht(y, 30), y = w, w = B;
    }
    e = e + w >>> 0, n = n + y >>> 0, r = r + g >>> 0, o = o + m >>> 0, s = s + u >>> 0;
  }
  const d = /* @__PURE__ */ new Uint8Array(20), b = new DataView(d.buffer);
  return b.setUint32(0, e, !1), b.setUint32(4, n, !1), b.setUint32(8, r, !1), b.setUint32(12, o, !1), b.setUint32(16, s, !1), d;
}
function Te(t) {
  const e = [
    7,
    12,
    17,
    22,
    7,
    12,
    17,
    22,
    7,
    12,
    17,
    22,
    7,
    12,
    17,
    22,
    5,
    9,
    14,
    20,
    5,
    9,
    14,
    20,
    5,
    9,
    14,
    20,
    5,
    9,
    14,
    20,
    4,
    11,
    16,
    23,
    4,
    11,
    16,
    23,
    4,
    11,
    16,
    23,
    4,
    11,
    16,
    23,
    6,
    10,
    15,
    21,
    6,
    10,
    15,
    21,
    6,
    10,
    15,
    21,
    6,
    10,
    15,
    21
  ], n = /* @__PURE__ */ new Uint32Array(64);
  for (let p = 0; p < 64; p++) n[p] = Math.floor(Math.abs(Math.sin(p + 1)) * 4294967296) >>> 0;
  let r = 1732584193, o = 4023233417, s = 2562383102, i = 271733878;
  const a = t.length * 8, l = (56 - (t.length + 1) % 64 + 64) % 64, h = new Uint8Array(t.length + 1 + l + 8);
  h.set(t), h[t.length] = 128;
  const c = new DataView(h.buffer);
  c.setUint32(h.length - 8, a >>> 0, !0), c.setUint32(h.length - 4, Math.floor(a / 4294967296), !0);
  for (let p = 0; p < h.length; p += 64) {
    const w = /* @__PURE__ */ new Uint32Array(16);
    for (let f = 0; f < 16; f++) w[f] = c.getUint32(p + f * 4, !0);
    let y = r, g = o, m = s, u = i;
    for (let f = 0; f < 64; f++) {
      let A, U;
      f < 16 ? (A = g & m | ~g & u, U = f) : f < 32 ? (A = u & g | ~u & m, U = (5 * f + 1) % 16) : f < 48 ? (A = g ^ m ^ u, U = (3 * f + 5) % 16) : (A = m ^ (g | ~u), U = 7 * f % 16), A = A + y + n[f] + w[U] >>> 0, y = u, u = m, m = g, g = g + (A << e[f] | A >>> 32 - e[f]) >>> 0;
    }
    r = r + y >>> 0, o = o + g >>> 0, s = s + m >>> 0, i = i + u >>> 0;
  }
  const d = /* @__PURE__ */ new Uint8Array(16), b = new DataView(d.buffer);
  return b.setUint32(0, r, !0), b.setUint32(4, o, !0), b.setUint32(8, s, !0), b.setUint32(12, i, !0), d;
}
function St(t, e) {
  return e ? De(t) : Me(t);
}
function Et(t, e) {
  const n = new Uint8Array(t.length + e.length);
  return n.set(t, 0), n.set(e, t.length), n;
}
function ut(t, e) {
  switch (t) {
    case "SHA-1":
      return ke(e);
    case "SHA-256":
      return Ce(e);
    case "SHA-384":
      return St(e, !0);
    case "SHA-512":
      return St(e, !1);
    case "MD5":
      return Te(e);
    default:
      throw new Error(`crypto: synchronous digest for "${t}" is not supported in the browser polyfill`);
  }
}
function ln(t, e, n) {
  const r = t === "SHA-384" || t === "SHA-512" ? 128 : 64;
  let o = e.length > r ? ut(t, e) : e;
  const s = new Uint8Array(r);
  s.set(o);
  const i = new Uint8Array(r), a = new Uint8Array(r);
  for (let l = 0; l < r; l++)
    i[l] = s[l] ^ 54, a[l] = s[l] ^ 92;
  return ut(t, Et(a, ut(t, Et(i, n))));
}
var We = $t, Ie = Rt, H = "tarballs", Ge = 1, je = 268435456, Bt = 12096e5;
function Oe() {
  return _t(We, Ie, Ge, H);
}
function Fe(t, e) {
  return new Promise((n, r) => {
    const o = t.transaction(H, "readonly").objectStore(H).get(e);
    o.onsuccess = () => n(o.result ?? null), o.onerror = () => r(o.error);
  });
}
function Re(t, e, n) {
  return new Promise((r, o) => {
    const s = t.transaction(H, "readwrite");
    s.objectStore(H).put(n, e), s.oncomplete = () => r(), s.onerror = () => o(s.error);
  });
}
async function Ne() {
  const t = await Oe();
  return t ? {
    async get(e) {
      try {
        const n = await Fe(t, e);
        return !n?.bytes || Date.now() - n.storedAt > Bt ? null : n.bytes;
      } catch {
        return null;
      }
    },
    async put(e, n, r) {
      try {
        await Re(t, e, {
          bytes: n,
          integrity: r,
          storedAt: Date.now(),
          size: n.byteLength
        });
      } catch {
      }
    },
    clear() {
      return new Promise((e) => {
        try {
          const n = t.transaction(H, "readwrite");
          n.objectStore(H).clear(), n.oncomplete = () => e(), n.onerror = () => e();
        } catch {
          e();
        }
      });
    },
    prune(e = je, n = Bt) {
      return new Promise((r) => {
        try {
          const o = t.transaction(H, "readwrite"), s = o.objectStore(H).openCursor(), i = Date.now(), a = [];
          s.onsuccess = () => {
            const l = s.result;
            if (l) {
              const c = l.value;
              !c?.storedAt || i - c.storedAt > n ? l.delete() : a.push({
                key: l.key,
                storedAt: c.storedAt,
                size: c.size ?? 0
              }), l.continue();
              return;
            }
            let h = a.reduce((c, d) => c + d.size, 0);
            if (h > e) {
              a.sort((d, b) => d.storedAt - b.storedAt);
              const c = t.transaction(H, "readwrite").objectStore(H);
              for (const d of a) {
                if (h <= e) break;
                c.delete(d.key), h -= d.size;
              }
            }
            r();
          }, s.onerror = () => r(), o.onerror = () => r();
        } catch {
          r();
        }
      });
    },
    close() {
      try {
        t.close();
      } catch {
      }
    }
  } : null;
}
var dt = null;
function fn() {
  return dt || (dt = Ne()), dt;
}
export {
  $ as A,
  Ze as C,
  X as D,
  P as E,
  ot as M,
  K as N,
  J as O,
  Mt as P,
  qe as S,
  Qe as T,
  nn as _,
  he as a,
  tn as b,
  en as c,
  Y as d,
  ft as f,
  It as g,
  sn as h,
  an as i,
  Ke as j,
  st as k,
  yt as l,
  rn as m,
  ut as n,
  at as o,
  on as p,
  ln as r,
  mt as s,
  fn as t,
  cn as u,
  Pe as v,
  Ye as w,
  Xe as x,
  Je as y
};

//# sourceMappingURL=tarball-cache-DPLSvKtI.js.map