import { n as a } from "./rolldown-runtime-DpiKQypI.js";
var y = /* @__PURE__ */ a({
  base64ToBytes: () => h,
  bytesToBase64: () => f,
  bytesToHex: () => c,
  bytesToLatin1: () => u
}), i = 8192;
function f(t) {
  const n = [];
  for (let e = 0; e < t.length; e += i) {
    const o = Math.min(e + i, t.length);
    let s = "";
    for (let r = e; r < o; r++) s += String.fromCharCode(t[r]);
    n.push(s);
  }
  return btoa(n.join(""));
}
function h(t) {
  const n = atob(t), e = new Uint8Array(n.length);
  for (let o = 0; o < n.length; o++) e[o] = n.charCodeAt(o);
  return e;
}
var l = new Array(256);
for (let t = 0; t < 256; t++) l[t] = (t < 16 ? "0" : "") + t.toString(16);
function c(t) {
  const n = new Array(t.length);
  for (let e = 0; e < t.length; e++) n[e] = l[t[e]];
  return n.join("");
}
function u(t) {
  const n = [];
  for (let e = 0; e < t.length; e += i) {
    const o = Math.min(e + i, t.length);
    let s = "";
    for (let r = e; r < o; r++) s += String.fromCharCode(t[r]);
    n.push(s);
  }
  return n.join("");
}
export {
  u as a,
  c as i,
  y as n,
  f as r,
  h as t
};

//# sourceMappingURL=byte-encoding-DY8VFsBe.js.map