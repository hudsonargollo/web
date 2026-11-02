import { h as d, m as _, n as E, r as c } from "./lab-keys-CG3byUca.js";
import { n as b, r as L, u as f } from "./cdn-urls-BD7A9UuD.js";
function h(i) {
  return i.__krikkitLabEsbuild ?? i.__deepthoughtEsbuild;
}
function l(i) {
  return i.__krikkitLabEsbuildReady ?? i.__deepthoughtEsbuildReady ?? null;
}
function n(i, t) {
  i[E] = t, i[_] = t;
}
function a(i, t) {
  i[c] = t, i[d] = t;
}
function R(i) {
  const t = globalThis, o = h(t);
  if (o) return o;
  if (t.__esbuild) {
    a(t, t.__esbuild);
    const s = Promise.resolve(t.__esbuild);
    return n(t, s), s;
  }
  const u = (async () => {
    try {
      const s = await f(L), r = s.default || s;
      try {
        await r.initialize({ wasmURL: i?.wasmURL || b });
      } catch (e) {
        if (!(e instanceof Error && e.message.includes('Cannot call "initialize" more than once'))) throw e;
      }
      return a(t, r), r;
    } catch (s) {
      throw n(t, void 0), new Error(`esbuild: initialization failed -- ${s}`);
    }
  })();
  return n(t, u), u;
}
function A() {
  return l(globalThis);
}
function I() {
  const i = globalThis;
  try {
    l(i)?.stop?.();
  } catch {
  }
  a(i, void 0), n(i, void 0);
}
export {
  R as n,
  A as r,
  I as t
};

//# sourceMappingURL=esbuild-engine-DrysNYR_.js.map