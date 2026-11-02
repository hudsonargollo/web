import { c as a, y as n } from "./lab-keys-CG3byUca.js";
import { dirname as l, resolve as d } from "node:path";
import { fileURLToPath as m } from "node:url";
import { readFile as i } from "node:fs/promises";
var p = [
  `../${a}`,
  `../${n}`,
  `../../static/${a}`,
  `../../static/${n}`,
  `../../dist/${a}`,
  `../../dist/${n}`
], c = null;
async function h(r) {
  const e = l(m(r)), s = [];
  for (const u of p) {
    const t = d(e, u);
    try {
      return await i(t), t;
    } catch (o) {
      const f = o instanceof Error ? o.message : String(o);
      s.push(`  ${t}: ${f}`);
    }
  }
  throw new Error(`[lab-runtime] could not locate service worker source. Tried:
${s.join(`
`)}`);
}
async function w(r) {
  return c || (c = (async () => {
    const e = await h(r);
    return i(e, "utf8");
  })()), c;
}
function A() {
  return {
    "Content-Type": "application/javascript; charset=utf-8",
    "Service-Worker-Allowed": "/",
    "Cache-Control": "no-cache"
  };
}
export {
  w as n,
  A as t
};

//# sourceMappingURL=headers-BDWougG4.js.map