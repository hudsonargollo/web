Object.defineProperty(exports,Symbol.toStringTag,{value:"Module"});const M=require("./rolldown-runtime-DGqZhkpL.cjs"),D=require("./pako.esm-Da0x74IB.cjs"),o=require("./host-CO25GR_D.cjs"),J=require("./lab-keys-BeJxXanB.cjs"),g=require("./offload-CHxIKckK.cjs");let C=require("node:fs"),m=require("node:path"),O=require("node:url"),q=require("node:worker_threads"),w=require("node:http");w=M.__toESM(w,1);let z=require("node:crypto"),f=require("node:fs/promises"),Z=require("node:os");function H(){return`"use strict";
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
`}function k(r){const i=new Set,u=new Set;let c=null,t=null;return r.on("message",e=>{const n={data:e};for(const d of i)try{d(n)}catch{}if(c)try{c(n)}catch{}}),r.on("error",e=>{const n={message:e.message,error:e};for(const d of u)try{d(n)}catch{}if(t)try{t(n)}catch{}}),{postMessage(e,n){n&&n.length?r.postMessage(e,n):r.postMessage(e)},terminate(){r.terminate()},addEventListener(e,n){e==="message"?i.add(n):e==="error"&&u.add(n)},removeEventListener(e,n){e==="message"?i.delete(n):e==="error"&&u.delete(n)},get onmessage(){return c},set onmessage(e){c=e},get onerror(){return t},set onerror(e){t=e}}}function l(r,i){return k(new q.Worker(H(),{eval:!0,workerData:{__deepthoughtSource:r},...i?{name:i}:{}}))}function G(r){const i=r.host??"127.0.0.1",u=r.port??0;let c=null,t=null;async function e(b){const s=[];for await(const a of b)s.push(Buffer.isBuffer(a)?a:Buffer.from(a));return Buffer.concat(s)}function n(b){const s={};for(const[a,L]of Object.entries(b))L!=null&&(s[a]=Array.isArray(L)?L.join(", "):L);return s}async function d(b,s){try{const a=new URL(b.url||"/",`http://${i}`),L=a.pathname.split("/").filter(Boolean);if(L[0]!=="__virtual__"||L.length<3){s.statusCode=404,s.setHeader("Content-Type","text/plain"),s.end("Not Found");return}const I=L[1],S=Number(L[2]);if(!Number.isFinite(S)){s.statusCode=400,s.setHeader("Content-Type","text/plain"),s.end("Invalid port");return}const h=await e(b),F=h.byteLength>0?h.buffer.slice(h.byteOffset,h.byteOffset+h.byteLength):void 0,N=L.slice(3),T=(N.length?`/${N.join("/")}`:"/")+a.search,A=await r.proxy.handleRequest(I,S,(b.method||"GET").toUpperCase(),T,n(b.headers),F);s.statusCode=A.statusCode;for(const[X,y]of Object.entries(A.headers))y!=null&&(Array.isArray(y),s.setHeader(X,y));const p=A.body?Buffer.isBuffer(A.body)?A.body:Buffer.from(A.body):Buffer.alloc(0);s.end(p)}catch(a){s.statusCode=500,s.setHeader("Content-Type","text/plain"),s.end(a instanceof Error?a.message:String(a))}}return{kind:"local-http",get baseUrl(){return t},async start(){if(c)return;c=w.default.createServer((s,a)=>{d(s,a)}),await new Promise((s,a)=>{c.once("error",a),c.listen(u,i,()=>{c.off("error",a),s()})});const b=c.address();b&&typeof b=="object"?t=`http://${i}:${b.port}`:t=`http://${i}`,r.proxy.setBaseUrl(t)},async stop(){const b=c;c=null,t=null,b&&await new Promise(s=>{b.close(()=>s())})}}}var v=2,P=6048e5;function B(){return process.env.DEEPTHOUGHT_CACHE||(0,m.join)((0,Z.tmpdir)(),"deepthought-snapshots")}function W(r,i){const u=(0,z.createHash)("sha256").update(i).digest("hex");return(0,m.join)(r,`${u}.bin`)}async function E(r=B()){try{await(0,f.mkdir)(r,{recursive:!0})}catch{return null}return(async()=>{try{const i=await(0,f.readdir)(r),u=Date.now();for(const c of i)if(c.endsWith(".meta.json"))try{const t=await(0,f.readFile)((0,m.join)(r,c),"utf8"),e=JSON.parse(t);if(e.schema!==v||e.createdAt!=null&&u-e.createdAt>P){const n=c.slice(0,-10);await(0,f.unlink)((0,m.join)(r,c)).catch(()=>{}),await(0,f.unlink)((0,m.join)(r,`${n}.bin`)).catch(()=>{})}}catch{}}catch{}})(),{async get(i){try{const u=W(r,i),c=u.replace(/\.bin$/,".meta.json"),t=await(0,f.readFile)(c,"utf8"),e=JSON.parse(t);if(e.schema!==v||e.createdAt!=null&&Date.now()-e.createdAt>P)return null;const n=await(0,f.readFile)(u);if(n.byteLength<4)return null;const d=n.readUInt32LE(0),b=n.subarray(4,4+d),s=n.buffer.slice(n.byteOffset+4+d,n.byteOffset+n.byteLength);return{manifest:JSON.parse(b.toString("utf8")),data:s}}catch{return null}},async set(i,u){const c=W(r,i),t=c.replace(/\.bin$/,".meta.json"),e=Buffer.from(JSON.stringify(u.manifest),"utf8"),n=Buffer.from(u.data),d=Buffer.alloc(4);d.writeUInt32LE(e.byteLength,0),await(0,f.writeFile)(c,Buffer.concat([d,e,n])),await(0,f.writeFile)(t,JSON.stringify({schema:v,createdAt:Date.now()}))},close(){}}}function x(){try{const r=(0,m.dirname)((0,O.fileURLToPath)({}.url)),i=[(0,m.join)(r,"..","..","__worker__.js"),(0,m.join)(r,"..","..","..","dist","__worker__.js"),(0,m.join)(process.cwd(),"dist","__worker__.js")];for(const u of i)if((0,C.existsSync)(u))return u}catch{}return null}function Q(){const r=Buffer.from(o.PROCESS_WORKER_BUNDLE_GZIP_BASE64,"base64");return D.ungzip_1(r,{to:"string"})}function j(r,i){return!i&&r&&(0,C.existsSync)(r)||r&&(0,C.existsSync)(r)?(0,C.readFileSync)(r,"utf8"):Q()}function V(r={}){let i=r.workerPath??x(),u=null;function c(t){if(!t&&u)return u;const e=j(i,!!t);return t||(u=e),e}return{kind:"node",defaultHeadless:!0,canCreateWorkers(){return!0},createWorker(t){if(t.type==="url"){let d=t.url;if(d.startsWith("file:")&&(d=(0,O.fileURLToPath)(d)),!(0,C.existsSync)(d))throw new Error(`[DeepThoughtEngine] Node host cannot load worker URL: ${t.url}`);const b=(0,C.readFileSync)(d,"utf8"),s=l(b,t.name);return J.markHostWorkerDirect(s,!0),s}if(t.type==="source")return l(t.source,t.name);const e=c(t.embedded),n=l(e,t.name);return i&&!t.embedded&&J.markHostWorkerDirect(n,!0),n},async probeProcessWorkerUrl(t){if(t){let n=t;return n.startsWith("file:")&&(n=(0,O.fileURLToPath)(n)),(0,C.existsSync)(n)?(i=n,u=null,n):null}const e=x();return e?(i=e,u=null,e):null},disposeGlobalResources(){u=null},async openSnapshotCache(t){return t.enableSnapshotCache===!1||t.packageStore==="memory"?null:E(r.cacheDir)},createHttpIngress({proxy:t,headless:e}){return e?G({proxy:t,host:r.httpHost,port:r.httpPort}):{kind:"programmatic",baseUrl:null}}}}g.setRuntimeHost(V());exports.DeepThoughtEngine=o.LabRuntime;exports.DeepThoughtFS=o.LabFS;exports.DeepThoughtFSClient=o.LabFSClient;exports.DeepThoughtFSClientError=o.LabFSClientError;exports.DeepThoughtProcess=o.LabProcess;exports.DeepThoughtSWSetupError=o.DeepThoughtSWSetupError;exports.DependencyInstaller=o.DependencyInstaller;exports.LabFS=o.LabFS;exports.LabFSClient=o.LabFSClient;exports.LabFSClientError=o.LabFSClientError;exports.LabProcess=o.LabProcess;exports.LabRuntime=o.LabRuntime;exports.MemoryVolume=o.MemoryVolume;exports.RequestProxy=o.RequestProxy;exports.createLocalHttpIngress=G;exports.createNodeHost=V;exports.discoverWorkspaces=o.discoverWorkspaces;exports.getProxyInstance=o.getProxyInstance;exports.getRuntimeHost=g.getRuntimeHost;exports.install=o.install;exports.openFsSnapshotCache=E;exports.readWorkspacePatterns=o.readWorkspacePatterns;exports.resetProxy=o.resetProxy;exports.resetRuntimeHost=g.resetRuntimeHost;exports.setRuntimeHost=g.setRuntimeHost;

//# sourceMappingURL=headless.cjs.map