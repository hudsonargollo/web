var r = null, o = null, l = [
  "registry.npmjs.org",
  "github.com",
  "raw.githubusercontent.com",
  "api.github.com",
  "objects.githubusercontent.com",
  "esm.sh",
  "unpkg.com",
  "cdn.jsdelivr.net",
  "localhost",
  "127.0.0.1"
];
function c() {
  if (r) return r;
  try {
    return typeof localStorage < "u" ? localStorage.getItem("__corsProxyUrl") ?? null : null;
  } catch {
    return null;
  }
}
function a(t) {
  r = t;
}
function u() {
  return c();
}
function h(t) {
  if (t === null) {
    o = null;
    return;
  }
  o = /* @__PURE__ */ new Set([...l, ...t]);
}
function s(t) {
  if (!o) return !0;
  try {
    const e = new URL(t).hostname;
    for (const n of o) {
      const i = n === "localhost" || /^[0-9.]+$/.test(n) || n.includes(":");
      if (e === n || !i && e.endsWith("." + n)) return !0;
    }
    return !1;
  } catch {
    return !1;
  }
}
async function f(t, e) {
  const n = c();
  if (n) {
    if (!s(t)) throw new Error(`Fetch blocked: "${new URL(t).hostname}" is not in the allowedFetchDomains whitelist`);
    return fetch(n + encodeURIComponent(t), e);
  }
  return fetch(t, e);
}
function m(t) {
  const e = c();
  if (e && !s(t)) throw new Error(`Fetch blocked: "${new URL(t).hostname}" is not in the allowedFetchDomains whitelist`);
  return e ? e + encodeURIComponent(t) : t;
}
export {
  a,
  h as i,
  f as n,
  m as r,
  u as t
};

//# sourceMappingURL=cross-origin-n9Rrvq6y.js.map