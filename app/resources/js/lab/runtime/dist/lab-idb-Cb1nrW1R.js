import { i as l } from "./lab-keys-CG3byUca.js";
function u(e, o, r) {
  return typeof indexedDB > "u" ? Promise.resolve(null) : new Promise((t) => {
    try {
      const n = indexedDB.open(e, o);
      n.onupgradeneeded = () => {
        const i = n.result;
        i.objectStoreNames.contains(r) || i.createObjectStore(r);
      }, n.onsuccess = () => t(n.result), n.onerror = () => t(null);
    } catch {
      t(null);
    }
  });
}
async function f(e, o, r) {
  const t = [];
  return await new Promise((n, i) => {
    const c = e.transaction(r, "readonly"), s = c.objectStore(r).openCursor();
    s.onsuccess = () => {
      const a = s.result;
      if (!a) {
        n();
        return;
      }
      t.push({
        key: a.key,
        value: a.value
      }), a.continue();
    }, s.onerror = () => i(s.error), c.onerror = () => i(c.error);
  }), t.length === 0 ? 0 : (await new Promise((n, i) => {
    const c = o.transaction(r, "readwrite"), s = c.objectStore(r);
    for (const a of t) s.put(a.value, a.key);
    c.oncomplete = () => n(), c.onerror = () => i(c.error);
  }), t.length);
}
async function d(e, o, r) {
  const t = await u(e, o.version, r);
  if (t)
    try {
      if (!t.objectStoreNames.contains(r)) return;
      await f(t, o, r);
    } finally {
      try {
        t.close();
      } catch {
      }
    }
}
function y(e) {
  try {
    return typeof localStorage < "u" && localStorage.getItem(`krikkit-lab-idb-migration-v1:${e}`) === "1";
  } catch {
    return !1;
  }
}
function b(e) {
  try {
    localStorage?.setItem(`${l}${e}`, "1");
  } catch {
  }
}
async function p(e, o, r, t) {
  const n = await u(e, r, t);
  if (!n || y(e)) return n;
  try {
    await d(o, n, t), b(e);
  } catch {
  }
  return n;
}
export {
  p as t
};

//# sourceMappingURL=lab-idb-Cb1nrW1R.js.map