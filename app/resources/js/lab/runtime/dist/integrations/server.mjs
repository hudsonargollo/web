import { t as c } from "../lab-keys-CG3byUca.js";
import { n, t as o } from "../headers-BDWougG4.js";
import { Buffer as s } from "node:buffer";
async function t() {
  return n(import.meta.url);
}
async function f(r) {
  const e = await t();
  return new Response(e, {
    status: 200,
    headers: o()
  });
}
async function m() {
  const r = await t(), e = o();
  return {
    body: s.from(r, "utf8"),
    headers: e,
    contentType: e["Content-Type"]
  };
}
export {
  c as DEFAULT_SW_PATH,
  t as getServiceWorkerSource,
  f as serveSW,
  m as serveSWNode
};

//# sourceMappingURL=server.mjs.map