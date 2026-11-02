var t = "__DEEPTHOUGHT_CREATE_BROWSER_HOST__", o = "__KRIKKIT_LAB_CREATE_BROWSER_HOST__";
function G() {
  const _ = globalThis;
  for (const r of [o, t]) {
    const e = _[r];
    if (typeof e == "function") return e;
  }
  return null;
}
function f(_) {
  try {
    const r = globalThis;
    _ ? (r[o] = _, r[t] = _) : (delete r[o], delete r[t]);
  } catch {
  }
}
var a = "__deepthought_wasi_init__", s = "__krikkit_lab_wasi_init__", E = "__deepthought_broker_ready__", A = "__krikkit_lab_broker_ready__", i = "__deepthought_worker_error__", n = "__krikkit_lab_worker_error__";
var u = "__deepthoughtWorkerData", l = "__krikkitLabWorkerData", R = "__DEEPTHOUGHT_THREAD_ID__", h = "__KRIKKIT_LAB_THREAD_ID__";
function D(_, r) {
  return {
    [s]: !0,
    [a]: !0,
    source: _,
    workerData: r
  };
}
function W(_) {
  return {
    [n]: _,
    [i]: _
  };
}
function C(_) {
  if (!_ || typeof _ != "object") return !1;
  const r = _;
  return "__krikkit_lab_broker_ready__" in r || "__deepthought_broker_ready__" in r;
}
function c(_) {
  if (!_ || typeof _ != "object") return null;
  const r = _, e = r.__krikkit_lab_worker_error__ ?? r.__deepthought_worker_error__;
  return e == null ? null : String(e);
}
function H(_) {
  return c(_) !== null;
}
function w(_) {
  if (!_ || typeof _ != "object") return null;
  const r = _;
  if (!("__krikkit_lab_worker_exit__" in r) && !("__deepthought_worker_exit__" in r)) return null;
  const e = r.__krikkit_lab_worker_exit__ ?? r.__deepthought_worker_exit__;
  return Number(e) || 0;
}
function Y() {
  return `self.onmessage = (event) => {
  if (!event.data || (!event.data.${s} && !event.data.${a})) return;
  const init = event.data;
  globalThis.${l} = init.workerData;
  globalThis.${u} = init.workerData;
  self.onmessage = null;
  try {
    (0, eval)(init.source);
    self.postMessage({ ${A}: true, ${E}: true });
  } catch (error) {
    const msg = String(error && error.stack || error);
    self.postMessage({ ${n}: msg, ${i}: msg });
  }
};`;
}
function K(_, r) {
  const e = String(r);
  return _.replaceAll(h, e).replaceAll(R, e);
}
var O = "__deepthoughtDirect", B = "__krikkitLabDirect", T = "__deepthoughtRevokeUrl", v = "__krikkitLabRevokeUrl";
function N(_, r = !0) {
  const e = _;
  e[B] = r, e[O] = r;
}
function y(_) {
  const r = _;
  return !!(r.__krikkitLabDirect ?? r.__deepthoughtDirect);
}
function P(_, r) {
  const e = _;
  e[v] = r ?? null, e[T] = r ?? null;
}
function U(_) {
  const r = _;
  return String(r.__krikkitLabRevokeUrl ?? r.__deepthoughtRevokeUrl ?? "");
}
var b = "__deepthoughtVolume", g = "__krikkitLabVolume", M = "__deepthoughtEsbuild", m = "__krikkitLabEsbuild", $ = "__deepthoughtEsbuildReady", F = "__krikkitLabEsbuildReady";
function V() {
  const _ = globalThis;
  return _.__krikkitLabVolume ?? _.__deepthoughtVolume;
}
function j(_) {
  const r = globalThis;
  r[g] = _, r[b] = _;
}
var p = "__deepthoughtInspect", d = "__krikkitLabInspect", x = "__deepthoughtInspectConfig", X = "__krikkitLabInspectConfig", z = "__deepthoughtInspectAgent", q = "__krikkitLabInspectAgent";
function J(_) {
  if (!_ || typeof _ != "object") return !1;
  const r = _;
  return r.__krikkitLabInspect === 1 || r.__deepthoughtInspect === 1;
}
function Q(_) {
  return {
    [d]: 1,
    [p]: 1,
    ..._
  };
}
var I = ".deepthought_history", k = ".krikkit-lab_history";
function Z(_) {
  return [`${_}/${k}`, `${_}/${I}`];
}
function __(_) {
  return `${_}/${k}`;
}
var L = "/__krikkit_lab_sw__.js", S = "/__deepthought_sw__.js", r_ = L, e_ = "__krikkit_lab_sw__.js", t_ = "__deepthought_sw__.js";
function o_() {
  return [L, S];
}
var a_ = "krikkit-lab-snapshots", s_ = "deepthought-snapshots", i_ = "krikkit-lab-wasm-modules", n_ = "deepthought-wasm-modules", k_ = "krikkit-lab-tarballs", L_ = "deepthought-tarballs", E_ = "krikkit-lab-idb-migration-v1:";
export {
  o_ as A,
  Z as B,
  i as C,
  Q as D,
  H as E,
  G as F,
  W as H,
  V as I,
  w as L,
  __ as M,
  f as N,
  y as O,
  j as P,
  K as R,
  u as S,
  C as T,
  D as U,
  Y as V,
  x as _,
  q as a,
  L_ as b,
  e_ as c,
  i_ as d,
  l as f,
  z as g,
  $ as h,
  E_ as i,
  N as j,
  J as k,
  k_ as l,
  M as m,
  m as n,
  X as o,
  n as p,
  F as r,
  a_ as s,
  r_ as t,
  h as u,
  s_ as v,
  U as w,
  n_ as x,
  t_ as y,
  P as z
};

//# sourceMappingURL=lab-keys-CG3byUca.js.map