import{F as Q,N as Y}from"./lab-keys-CG3byUca.js";import{S as L,s as Z,t as ee}from"./config-BUEL78Ec.js";import{n as te,r as re}from"./cdn-urls-BD7A9UuD.js";let qe,de,_,Ne,Xe,G,He,ze,Ge,$e,Je,Ke,Qe,Ve;let __tla=(async()=>{var m=null,P=null;function se(){const e=Q();return e||null}Ne=function(e){P=e,Y(e)};He=function(e){m=e};function N(){return P??se()}_=function(){if(!m){const e=N();if(!e)throw new Error("[DeepThoughtEngine] No RuntimeHost registered. Import the Lab runtime bundle or headless host.");P=e,m=e()}return m};Ve=async function(){if(m)return m;for(let e=0;e<50;e++){const t=N();if(t)return P=t,m=t(),m;await new Promise(s=>setTimeout(s,0))}return _()};$e=function(){m?.disposeGlobalResources?.(),m=null};var H=Symbol("Comlink.proxy"),ne=Symbol("Comlink.endpoint"),ae=Symbol("Comlink.releaseProxy"),O=Symbol("Comlink.finalizer"),A=Symbol("Comlink.thrown"),R=e=>typeof e=="object"&&e!==null||typeof e=="function",V=new Map([["proxy",{canHandle:e=>R(e)&&e[H],serialize(e){const{port1:t,port2:s}=new MessageChannel;return $(e,t),[s,[s]]},deserialize(e){return e.start(),G(e)}}],["throw",{canHandle:e=>R(e)&&A in e,serialize({value:e}){let t;return e instanceof Error?t={isError:!0,value:{message:e.message,name:e.name,stack:e.stack}}:t={isError:!1,value:e},[t,[]]},deserialize(e){throw e.isError?Object.assign(new Error(e.value.message),e.value):e.value}}]]);function ie(e,t){for(const s of e)if(t===s||s==="*"||s instanceof RegExp&&s.test(t))return!0;return!1}function $(e,t=globalThis,s=["*"]){t.addEventListener("message",function r(a){if(!a||!a.data)return;if(!ie(s,a.origin)){console.warn(`Invalid origin '${a.origin}' for comlink proxy`);return}const{id:n,type:i,path:o}=Object.assign({path:[]},a.data),l=(a.data.argumentList||[]).map(g);let c;try{const u=o.slice(0,-1).reduce((d,v)=>d[v],e),h=o.reduce((d,v)=>d[v],e);switch(i){case"GET":c=h;break;case"SET":u[o.slice(-1)[0]]=g(a.data.value),c=!0;break;case"APPLY":c=h.apply(u,l);break;case"CONSTRUCT":c=de(new h(...l));break;case"ENDPOINT":{const{port1:d,port2:v}=new MessageChannel;$(e,v),c=J(d,[d])}break;case"RELEASE":c=void 0;break;default:return}}catch(u){c={value:u,[A]:0}}Promise.resolve(c).catch(u=>({value:u,[A]:0})).then(u=>{const[h,d]=I(u);t.postMessage(Object.assign(Object.assign({},h),{id:n}),d),i==="RELEASE"&&(t.removeEventListener("message",r),K(t),O in e&&typeof e[O]=="function"&&e[O]())}).catch(u=>{const[h,d]=I({value:new TypeError("Unserializable return value"),[A]:0});t.postMessage(Object.assign(Object.assign({},h),{id:n}),d)})}),t.start&&t.start()}function oe(e){return e.constructor.name==="MessagePort"}function K(e){oe(e)&&e.close()}G=function(e,t){const s=new Map;return e.addEventListener("message",function(a){const{data:n}=a;if(!n||!n.id)return;const i=s.get(n.id);if(i)try{i(n)}finally{s.delete(n.id)}}),C(e,s,[],t)};function S(e){if(e)throw new Error("Proxy has been released and is not useable")}function q(e){return w(e,new Map,{type:"RELEASE"}).then(()=>{K(e)})}var T=new WeakMap,x="FinalizationRegistry"in globalThis&&new FinalizationRegistry(e=>{const t=(T.get(e)||0)-1;T.set(e,t),t===0&&q(e)});function le(e,t){const s=(T.get(t)||0)+1;T.set(t,s),x&&x.register(e,t,e)}function ce(e){x&&x.unregister(e)}function C(e,t,s=[],r=function(){}){let a=!1;const n=new Proxy(r,{get(i,o){if(S(a),o===ae)return()=>{ce(n),q(e),t.clear(),a=!0};if(o==="then"){if(s.length===0)return{then:()=>n};const l=w(e,t,{type:"GET",path:s.map(c=>c.toString())}).then(g);return l.then.bind(l)}return C(e,t,[...s,o])},set(i,o,l){S(a);const[c,u]=I(l);return w(e,t,{type:"SET",path:[...s,o].map(h=>h.toString()),value:c},u).then(g)},apply(i,o,l){S(a);const c=s[s.length-1];if(c===ne)return w(e,t,{type:"ENDPOINT"}).then(g);if(c==="bind")return C(e,t,s.slice(0,-1));const[u,h]=z(l);return w(e,t,{type:"APPLY",path:s.map(d=>d.toString()),argumentList:u},h).then(g)},construct(i,o){S(a);const[l,c]=z(o);return w(e,t,{type:"CONSTRUCT",path:s.map(u=>u.toString()),argumentList:l},c).then(g)}});return le(n,e),n}function ue(e){return Array.prototype.concat.apply([],e)}function z(e){const t=e.map(I);return[t.map(s=>s[0]),ue(t.map(s=>s[1]))]}var X=new WeakMap;function J(e,t){return X.set(e,t),e}de=function(e){return Object.assign(e,{[H]:!0})};function I(e){for(const[t,s]of V)if(s.canHandle(e)){const[r,a]=s.serialize(e);return[{type:"HANDLER",name:t,value:r},a]}return[{type:"RAW",value:e},X.get(e)||[]]}function g(e){switch(e.type){case"HANDLER":return V.get(e.name).deserialize(e.value);case"RAW":return e.value}}function w(e,t,s,r){return new Promise(a=>{const n=fe();t.set(n,a),e.start&&e.start(),e.postMessage(Object.assign({id:n},s),r)})}function fe(){return new Array(4).fill(0).map(()=>Math.floor(Math.random()*Number.MAX_SAFE_INTEGER).toString(16)).join("-")}var he=`
"use strict";

// CDN URLs injected at build time
const ESBUILD_ESM_URL = "${re}";
const ESBUILD_WASM_URL = "${te}";
const PAKO_URL = "${ee}";

const cdnImport = new Function("url", "return import(url)");

let esbuildEngine = null;
let pakoModule = null;
let _initialized = false;

// minimal Comlink-compatible expose() — implements the wire protocol that comlink.wrap() speaks on the main thread
function miniExpose(obj) {
  self.addEventListener("message", function handler(ev) {
    if (!ev || !ev.data || !ev.data.id) return;
    const { id, type, path } = { path: [], ...ev.data };

    const args = (ev.data.argumentList || []).map(function(a) {
      return (a && a.type === "RAW") ? a.value : a;
    });

    let returnValue;
    try {
      const parent = path.length > 1
        ? path.slice(0, -1).reduce(function(o, p) { return o[p]; }, obj)
        : obj;
      const target = path.reduce(function(o, p) { return o[p]; }, obj);

      switch (type) {
        case "GET":
          returnValue = target;
          break;
        case "SET":
          parent[path[path.length - 1]] = (ev.data.value && ev.data.value.type === "RAW")
            ? ev.data.value.value
            : ev.data.value;
          returnValue = true;
          break;
        case "APPLY":
          returnValue = target.apply(parent, args);
          break;
        case "CONSTRUCT":
          returnValue = new target(...args);
          break;
        case "RELEASE":
          returnValue = undefined;
          break;
        default:
          return;
      }
    } catch (err) {
      self.postMessage({
        id: id,
        type: "HANDLER",
        name: "throw",
        value: {
          isError: true,
          value: { message: (err && err.message) || String(err), name: (err && err.name) || "Error", stack: (err && err.stack) || "" }
        }
      });
      return;
    }

    Promise.resolve(returnValue)
      .then(function(result) {
        const transferables = [];
        if (result && Array.isArray(result.files)) {
          for (const file of result.files) {
            if (file && file.data instanceof Uint8Array && file.data.buffer instanceof ArrayBuffer) {
              transferables.push(file.data.buffer);
            }
          }
        }
        if (result && result.tarballBytes instanceof ArrayBuffer) {
          transferables.push(result.tarballBytes);
        }
        self.postMessage({ id: id, type: "RAW", value: result }, transferables);
      })
      .catch(function(err) {
        self.postMessage({
          id: id,
          type: "HANDLER",
          name: "throw",
          value: {
            isError: true,
            value: { message: (err && err.message) || String(err), name: (err && err.name) || "Error", stack: (err && err.stack) || "" }
          }
        });
      });
  });
}

const SEGMENT_SIZE = 8192;

function uint8ToBase64(data) {
  const segments = [];
  for (let offset = 0; offset < data.length; offset += SEGMENT_SIZE) {
    segments.push(
      String.fromCharCode.apply(
        null,
        Array.from(data.subarray(offset, offset + SEGMENT_SIZE))
      )
    );
  }
  return btoa(segments.join(""));
}

function readNullTerminated(buf, start, len) {
  // TextDecoder rejects SharedArrayBuffer-backed views, copy first
  const section = buf.subarray(start, start + len);
  const zeroPos = section.indexOf(0);
  const effLen = zeroPos >= 0 ? zeroPos : section.byteLength;
  const copy = new Uint8Array(effLen);
  copy.set(section.subarray(0, effLen));
  return new TextDecoder().decode(copy);
}

function readOctalField(buf, start, len) {
  const raw = readNullTerminated(buf, start, len).trim();
  return parseInt(raw, 8) || 0;
}

function classifyTypeFlag(flag) {
  switch (flag) {
    case "0": case "\\0": case "": return "file";
    case "5": return "directory";
    case "1": case "2": return "link";
    default: return "other";
  }
}

function* parseTar(raw) {
  const BLOCK = 512;
  let cursor = 0;
  while (cursor + BLOCK <= raw.length) {
    const header = raw.slice(cursor, cursor + BLOCK);
    cursor += BLOCK;
    if (header.every(function(b) { return b === 0; })) break;
    const nameField = readNullTerminated(header, 0, 100);
    if (!nameField) continue;
    const byteSize = readOctalField(header, 124, 12);
    const typeChar = String.fromCharCode(header[156]);
    const prefixField = readNullTerminated(header, 345, 155);
    const filepath = prefixField ? prefixField + "/" + nameField : nameField;
    const kind = classifyTypeFlag(typeChar);
    let payload;
    if (kind === "file") {
      payload = byteSize > 0 ? raw.slice(cursor, cursor + byteSize) : new Uint8Array(0);
      if (byteSize > 0) cursor += Math.ceil(byteSize / BLOCK) * BLOCK;
    }
    yield { filepath: filepath, kind: kind, byteSize: byteSize, payload: payload };
  }
}

class ByteQueue {
  constructor() { this.chunks = []; this.offset = 0; this.available = 0; }
  push(chunk) {
    if (!chunk.byteLength) return;
    this.chunks.push(chunk);
    this.available += chunk.byteLength;
  }
  take(length) {
    if (length > this.available) throw new Error("tar stream underflow");
    const output = new Uint8Array(length);
    let written = 0;
    while (written < length) {
      const first = this.chunks[0];
      const count = Math.min(length - written, first.byteLength - this.offset);
      output.set(first.subarray(this.offset, this.offset + count), written);
      written += count;
      this.offset += count;
      this.available -= count;
      if (this.offset === first.byteLength) {
        this.chunks.shift();
        this.offset = 0;
      }
    }
    return output;
  }
  skip(length) { this.take(length); }
}

function parseTarHeader(header) {
  if (header.every(function(b) { return b === 0; })) return null;
  const nameField = readNullTerminated(header, 0, 100);
  if (!nameField) return null;
  const byteSize = readOctalField(header, 124, 12);
  const typeChar = String.fromCharCode(header[156]);
  const prefixField = readNullTerminated(header, 345, 155);
  return {
    filepath: prefixField ? prefixField + "/" + nameField : nameField,
    kind: classifyTypeFlag(typeChar),
    byteSize: byteSize,
  };
}

async function* parseCompressedTar(compressed) {
  if (typeof DecompressionStream === "undefined") {
    if (!pakoModule) {
      const pakoMod = await cdnImport(PAKO_URL);
      pakoModule = pakoMod.default || pakoMod;
    }
    yield* parseTar(pakoModule.inflate(compressed));
    return;
  }
  const reader = new Blob([compressed]).stream()
    .pipeThrough(new DecompressionStream("gzip")).getReader();
  const queue = new ByteQueue();
  let current = null;
  while (true) {
    const chunk = await reader.read();
    if (!chunk.done) queue.push(chunk.value);
    while (true) {
      if (!current) {
        if (queue.available < 512) break;
        current = parseTarHeader(queue.take(512));
        if (!current) return;
      }
      const padded = Math.ceil(current.byteSize / 512) * 512;
      if (queue.available < padded) break;
      const payload = current.byteSize > 0 ? queue.take(current.byteSize) : new Uint8Array(0);
      if (padded > current.byteSize) queue.skip(padded - current.byteSize);
      yield {
        filepath: current.filepath,
        kind: current.kind,
        byteSize: current.byteSize,
        payload: current.kind === "file" ? payload : undefined,
      };
      current = null;
    }
    if (chunk.done) break;
  }
  if (current || queue.available > 0) throw new Error("Truncated tar archive");
}

function detectJsx(source) {
  if (/<[A-Z][a-zA-Z0-9.]*[\\s/>]/.test(source)) return true;
  if (/<\\/[a-zA-Z]/.test(source)) return true;
  if (/\\/>/.test(source)) return true;
  if (/<>|<\\/>/.test(source)) return true;
  if (/React\\.createElement\\b/.test(source)) return true;
  if (/jsx\\(|jsxs\\(|jsxDEV\\(/.test(source)) return true;
  return false;
}

const DEFAULT_DEFINE = {
  "import.meta.url": "import_meta.url",
  "import.meta.dirname": "import_meta.dirname",
  "import.meta.filename": "import_meta.filename",
  "import.meta": "import_meta",
};

// esbuild (~10MB) loads lazily on the first transform/build task — warm-up
// only pulls pako, which every extract task needs. With lazy install
// transforms most pool workers never fetch esbuild at all.
let _esbuildInitPromise = null;

function ensureEsbuild() {
  if (esbuildEngine) return Promise.resolve();
  if (_esbuildInitPromise) return _esbuildInitPromise;
  _esbuildInitPromise = (async function () {
    const esbuildMod = await cdnImport(ESBUILD_ESM_URL);
    const engine = esbuildMod.default || esbuildMod;
    try {
      await engine.initialize({ wasmURL: ESBUILD_WASM_URL });
    } catch (err) {
      if (!(err instanceof Error && err.message.includes('Cannot call "initialize" more than once'))) {
        throw err;
      }
    }
    esbuildEngine = engine;
  })();
  _esbuildInitPromise.catch(function () { _esbuildInitPromise = null; });
  return _esbuildInitPromise;
}

const endpoint = {
  async init() {
    if (_initialized) return;

    _initialized = true;
  },

  async transform(task) {
    await ensureEsbuild();
    if (!esbuildEngine) throw new Error("Worker not initialized");

    const opts = task.options || {};
    let loader = opts.loader || "js";
    const format = opts.format || "cjs";
    const define = opts.define || DEFAULT_DEFINE;

    if (loader === "js" && detectJsx(task.source)) loader = "jsx";

    const transformOpts = {
      loader: loader,
      format: format,
      target: opts.target || "esnext",
      platform: opts.platform || "neutral",
      define: define,
    };

    try {
      const output = await esbuildEngine.transform(task.source, transformOpts);
      return {
        type: "transform",
        id: task.id,
        code: output.code,
        warnings: (output.warnings || []).map(function(w) { return w.text || String(w); }),
      };
    } catch (err) {
      const fallbacks = loader === "js" ? ["jsx", "tsx", "ts"] : loader === "jsx" ? ["tsx"] : [];
      for (let i = 0; i < fallbacks.length; i++) {
        try {
          const output = await esbuildEngine.transform(task.source, Object.assign({}, transformOpts, { loader: fallbacks[i] }));
          return { type: "transform", id: task.id, code: output.code, warnings: [] };
        } catch (e) { /* try next */ }
      }
      if (err && err.message && err.message.includes("Top-level await")) {
        try {
          const output = await esbuildEngine.transform(task.source, Object.assign({}, transformOpts, { format: "esm" }));
          return { type: "transform", id: task.id, code: output.code, warnings: [] };
        } catch (e) { /* fall through */ }
      }
      return { type: "transform", id: task.id, code: task.source, warnings: [(err && err.message) || "transform failed"] };
    }
  },

  async transformBatch(task) {
    var results = await Promise.all(task.files.map(async function(file) {
      var result = await endpoint.transform({
        type: "transform",
        id: task.id,
        source: file.source,
        filePath: file.filePath,
        options: Object.assign({}, task.options || {}, { loader: file.loader }),
        priority: task.priority,
      });
      return { filePath: file.filePath, code: result.code, warnings: result.warnings };
    }));
    return { type: "transformBatch", id: task.id, results: results };
  },

  async extract(task) {
    if (!_initialized) throw new Error("Worker not initialized");

    // main thread passes cached tarball bytes on warm runs — skip the fetch
    let compressed;
    if (task.tarballBytes && task.tarballBytes.byteLength > 0) {
      compressed = new Uint8Array(task.tarballBytes);
    } else {
      const response = await fetch(task.tarballUrl);
      if (!response.ok) {
        throw new Error("Archive download failed (HTTP " + response.status + "): " + task.tarballUrl);
      }
      compressed = new Uint8Array(await response.arrayBuffer());
    }
    if (task.expectedShasum) {
      const hashInput = new Uint8Array(compressed.byteLength);
      hashInput.set(compressed);
      const hashBuffer = await crypto.subtle.digest("SHA-1", hashInput);
      const hashHex = Array.from(new Uint8Array(hashBuffer))
        .map(function(b) { return b.toString(16).padStart(2, "0"); })
        .join("");
      if (hashHex !== task.expectedShasum) {
        throw new Error("Integrity check failed for " + task.tarballUrl + ": expected shasum " + task.expectedShasum + ", got " + hashHex);
      }
    }
    const files = [];
    for await (const entry of parseCompressedTar(compressed)) {
      if (entry.kind !== "file" && entry.kind !== "directory") continue;
      let relative = entry.filepath;
      if (task.stripComponents > 0) {
        const segments = relative.split("/").filter(Boolean);
        if (segments.length <= task.stripComponents) continue;
        relative = segments.slice(task.stripComponents).join("/");
      }
      if (entry.kind === "file" && entry.payload) {
        const file = { path: relative, data: entry.payload, isBinary: true };
        if (task.streamPort) {
          task.streamPort.postMessage({ type: "file", file: file }, [file.data.buffer]);
        } else {
          files.push(file);
        }
      }
    }

    if (task.streamPort) {
      task.streamPort.postMessage({ type: "done" });
      task.streamPort.close();
    }
    const result = { type: "extract", id: task.id, files: files, streamed: !!task.streamPort };
    // hand the compressed bytes back so main can persist them (tarball cache)
    if (task.wantTarball) {
      result.tarballBytes = compressed.buffer.byteLength === compressed.byteLength
        ? compressed.buffer
        : compressed.slice().buffer;
    }
    return result;
  },

  async build(task) {
    await ensureEsbuild();
    if (!esbuildEngine) throw new Error("Worker not initialized");

    const fileMap = new Map();
    const entries = Object.entries(task.files);
    for (let i = 0; i < entries.length; i++) {
      fileMap.set(entries[i][0], entries[i][1]);
    }

    const volumePlugin = {
      name: "offload-volume",
      setup: function(build) {
        build.onLoad({ filter: /.*/ }, function(args) {
          const content = fileMap.get(args.path);
          if (content === undefined) return null;
          const ext = args.path.substring(args.path.lastIndexOf("."));
          const loaderMap = { ".ts": "ts", ".tsx": "tsx", ".js": "js", ".mjs": "js", ".cjs": "js", ".jsx": "jsx", ".json": "json", ".css": "css" };
          return { contents: content, loader: loaderMap[ext] || undefined };
        });
      },
    };

    try {
      const result = await esbuildEngine.build({
        entryPoints: task.entryPoints,
        stdin: task.stdin,
        bundle: task.bundle !== false,
        format: task.format || "esm",
        platform: task.platform || "browser",
        target: task.target || "esnext",
        minify: !!task.minify,
        external: task.external,
        write: false,
        plugins: [volumePlugin],
        absWorkingDir: task.absWorkingDir || "/",
      });

      return {
        type: "build",
        id: task.id,
        outputFiles: (result.outputFiles || []).map(function(f) {
          let text = f.text;
          if (!text && f.contents) {
            const c = f.contents;
            const decodable = (typeof SharedArrayBuffer !== "undefined" && c.buffer instanceof SharedArrayBuffer)
              ? (function () { const copy = new Uint8Array(c.byteLength); copy.set(c); return copy; })()
              : c;
            text = new TextDecoder().decode(decodable);
          }
          return { path: f.path, text: text };
        }),
        errors: (result.errors || []).map(function(e) { return e.text || String(e); }),
        warnings: (result.warnings || []).map(function(w) { return w.text || String(w); }),
      };
    } catch (err) {
      return {
        type: "build",
        id: task.id,
        outputFiles: [],
        errors: [(err && err.message) || "build failed"],
        warnings: [],
      };
    }
  },

  ping: function() {
    return true;
  },
};

miniExpose(endpoint);
`;function pe(){try{const e=_();return e.canCreateWorkers()?e.createWorker({type:"source",source:he}):null}catch{return null}}function me(){_().disposeGlobalResources?.()}var ye=class{workers=[];waitQueue=[];nextId=0;config;idleTimer=null;disposed=!1;broken=!1;constructor(e={}){const t=typeof navigator<"u"&&navigator.hardwareConcurrency||4;this.config={minWorkers:e.minWorkers??1,maxWorkers:e.maxWorkers??Math.min(t,Z.MAX_WORKERS_CAP),idleTimeoutMs:e.idleTimeoutMs??L.WORKER_IDLE_TIMEOUT,warmUpOnCreate:e.warmUpOnCreate??!0},this.idleTimer=setInterval(()=>this.reapIdle(),L.WORKER_REAP_INTERVAL)}async acquire(){if(this.disposed)throw new Error("WorkerPool is disposed");if(this.broken)throw new Error("WorkerPool is broken — Workers unavailable");const e=this.workers.find(t=>!t.busy&&t.initialized);if(e)return e.busy=!0,e.lastUsed=Date.now(),{worker:e,release:()=>this.release(e)};if(this.workers.length<this.config.maxWorkers){const t=this.tryCreateWorker();if(!t)throw this.broken=!0,this.rejectAllWaiters(),new Error("WorkerPool is broken — Worker construction failed");if(t.busy=!0,!t.initialized&&t.initPromise)try{await t.initPromise}catch(s){throw this.terminateWorker(t),this.broken=!0,this.rejectAllWaiters(),new Error(`WorkerPool is broken — Worker init failed: ${s instanceof Error?s.message:s}`)}return t.lastUsed=Date.now(),{worker:t,release:()=>this.release(t)}}return new Promise((t,s)=>{this.waitQueue.push({resolve:t,reject:s})})}dispose(){this.disposed=!0,this.idleTimer&&(clearInterval(this.idleTimer),this.idleTimer=null);for(const e of[...this.workers])this.terminateWorker(e);this.rejectAllWaiters(),me()}stats(){return{total:this.workers.length,busy:this.workers.filter(e=>e.busy).length,idle:this.workers.filter(e=>!e.busy).length,initialized:this.workers.filter(e=>e.initialized).length}}rejectAllWaiters(){for(const e of this.waitQueue)e.reject(new Error("WorkerPool is no longer available"));this.waitQueue.length=0}release(e){if(e.busy=!1,e.lastUsed=Date.now(),this.waitQueue.length>0){const t=this.waitQueue.shift();e.busy=!0,e.lastUsed=Date.now(),t.resolve({worker:e,release:()=>this.release(e)})}}tryCreateWorker(){const e=pe();if(!e)return null;try{const t=G(e),s=this.nextId++,r={thread:e,endpoint:t,busy:!1,initialized:!1,initPromise:null,lastUsed:Date.now(),id:s};if(this.config.warmUpOnCreate){const a=L.WORKER_INIT_TIMEOUT,n=t.init(),i=new Promise((o,l)=>setTimeout(()=>l(new Error("Worker init timed out")),a));r.initPromise=Promise.race([n,i]).then(()=>{r.initialized=!0,r.initPromise=null}).catch(o=>{throw this.terminateWorker(r),o})}return this.workers.push(r),r}catch{try{e.terminate()}catch{}return null}}reapIdle(){const e=Date.now(),t=this.workers.filter(a=>!a.busy&&a.initialized&&e-a.lastUsed>this.config.idleTimeoutMs),s=Math.max(0,this.workers.length-this.config.minWorkers),r=t.slice(0,s);for(const a of r)this.terminateWorker(a)}terminateWorker(e){const t=this.workers.indexOf(e);t>=0&&this.workers.splice(t,1);try{e.thread.terminate()}catch{}}},ge=1e5,we=1e4,be=50,ke=500,W=1024,ve=32,Se=100,B=[.1,.5,1,2,5,10,25,50,100,250,500,1e3,1/0],Me=["boot","packages","filesystem","modules","workers","processes","snapshots","http","browser"];function p(){const e=typeof performance<"u"?performance:void 0;if(e&&typeof e.now=="function"){const t=e.now();return(typeof e.timeOrigin=="number"?e.timeOrigin:Date.now()-t)+t}return Date.now()}function f(e){return Math.round(e*100)/100}function M(e,t,s,r){return e===void 0||!Number.isFinite(e)?t:Math.min(r,Math.max(s,e))}function Ee(){return typeof window<"u"?"browser":typeof process<"u"&&process.versions?.node?"node":"unknown"}function D(e){return typeof crypto<"u"&&typeof crypto.randomUUID=="function"?`${e}-${crypto.randomUUID()}`:`${e}-${Date.now()}-${Math.random().toString(36).slice(2)}`}function Ae(e,t=""){let s=0x811c9dc5;const r=`${t}:${e}`;for(let a=0;a<r.length;a++)s^=r.charCodeAt(a),s=Math.imul(s,0x1000193);return`h${(s>>>0).toString(16).padStart(8,"0")}`}function Te(e){const t=e.replace(/\\/g,"/").replace(/\/+$/,"");return t.slice(t.lastIndexOf("/")+1)||"/"}function j(e,t,s=""){if(!e)return;const r={};for(const[a,n]of Object.entries(e)){if(Object.keys(r).length>=ve)break;if(n===void 0)continue;const i=a.toLowerCase(),o=i.includes("url"),l=i.includes("path")||i==="file"||i.endsWith("file");if(o){if(!t.includeUrls||typeof n!="string")continue;r[a]=n.split(/[?#]/,1)[0].slice(0,512);continue}if(l&&typeof n=="string"){if(t.pathDetail==="none")continue;t.pathDetail==="basename"?r[a]=Te(n):t.pathDetail==="hash"?r[a]=Ae(n,s):r[a]=n.slice(0,1024);continue}typeof n=="string"?r[a]=n.slice(0,512):r[a]=n}return Object.keys(r).length>0?r:void 0}var U=class{count=0;totalMs=0;minMs=1/0;maxMs=0;buckets=new Array(B.length).fill(0);record(e){const t=Math.max(0,e);this.count++,this.totalMs+=t,this.minMs=Math.min(this.minMs,t),this.maxMs=Math.max(this.maxMs,t);const s=B.findIndex(r=>t<=r);this.buckets[s===-1?this.buckets.length-1:s]++}percentile(e){if(this.count===0)return 0;const t=Math.max(1,Math.ceil(this.count*e));let s=0;for(let r=0;r<this.buckets.length;r++)if(s+=this.buckets[r],s>=t)return B[r];return this.maxMs}snapshot(){return{count:this.count,totalMs:f(this.totalMs),minMs:this.count===0?0:f(this.minMs),maxMs:f(this.maxMs),p50Ms:f(this.percentile(.5)),p95Ms:f(this.percentile(.95)),p99Ms:f(this.percentile(.99))}}},xe=class{id;startedAt;profiler;options;nameValue;spansById=new Map;spanAggregates=new Map;categoryAggregates=new Map;countersMap=new Map;gaugesMap=new Map;sampleList=[];warningList=[];memorySamples=[];hashSalt=D("path");nextSpanId=1;droppedSpansValue=0;droppedSamplesValue=0;busyDurationMs=0;longTaskCount=0;longTaskTotalMs=0;longTaskLongestMs=0;droppedMetricKeys=0;memoryTimer=null;memorySamplePromises=new Set;memoryCapabilityWarningIssued=!1;memorySampleWarningIssued=!1;observer=null;stopping=null;reportValue=null;constructor(e,t){this.profiler=e,this.nameValue=t,this.id=D("profile"),this.startedAt=p(),this.options=e.options,e.enabled&&this.startObservers()}get name(){return this.nameValue}startObservers(){if(this.options.captureLongTasks&&typeof PerformanceObserver<"u")try{this.observer=new PerformanceObserver(e=>{for(const t of e.getEntries())this.addLongTask((performance.timeOrigin||this.startedAt)+t.startTime,t.duration,t.name)}),this.observer.observe({type:"longtask",buffered:!0})}catch{this.warning("long-task-unsupported","Long-task observation is unavailable in this environment.")}else this.options.captureLongTasks&&this.warning("long-task-unsupported","Long-task observation is unavailable in this environment.");this.options.captureMemory&&(this.scheduleMemorySample(),this.memoryTimer=setInterval(()=>{this.scheduleMemorySample()},this.options.memorySampleIntervalMs),this.memoryTimer.unref?.call(this.memoryTimer))}scheduleMemorySample(){const e=this.addMemorySample();this.memorySamplePromises.add(e),e.then(()=>this.memorySamplePromises.delete(e),()=>this.memorySamplePromises.delete(e))}begin(e,t={}){if(this.options.level==="counters")return null;const s=t.category??"filesystem",r=p();return{id:this.nextSpanId++,startedAt:r,name:e,category:s,thread:t.thread??"main",processId:t.processId,parentId:t.parentId,metadata:j(t.metadata,this.options,this.hashSalt)}}end(e){if(!e||e.ended)return 0;e.ended=!0;const t=Math.max(0,p()-e.startedAt);return this.recordCompletedSpan(e,t),t}recordSpan(e,t,s,r={}){if(this.options.level==="counters")return;s<t&&this.warning("clock-skew",`The ${e} span ended before it started; its duration was clamped to zero.`);const a={id:this.nextSpanId++,startedAt:t,name:e,category:r.category??"workers",thread:r.thread??"main",processId:r.processId,parentId:r.parentId,metadata:j(r.metadata,this.options,this.hashSalt),ended:!0};this.recordCompletedSpan(a,Math.max(0,s-t))}recordCompletedSpan(e,t){this.busyDurationMs+=t;const s=`${e.category}:${e.name}`,r=this.spanAggregates.get(s)??new U;r.record(t),this.spanAggregates.set(s,r);const a=this.categoryAggregates.get(e.category)??new U;a.record(t),this.categoryAggregates.set(e.category,a);const n={id:e.id,parentId:e.parentId,name:e.name,category:e.category,startTime:e.startedAt,durationMs:f(t),thread:e.thread,processId:e.processId,metadata:e.metadata};if(this.spansById.size<this.options.maxSpans)this.spansById.set(n.id,n);else{const i=[...this.spansById.values()].reduce((o,l)=>l.durationMs<o.durationMs?l:o);t>=this.options.slowSpanThresholdMs&&t>i.durationMs?(this.spansById.delete(i.id),this.spansById.set(n.id,n),this.droppedSpansValue++):this.droppedSpansValue++}}count(e,t=1){if(!this.countersMap.has(e)&&this.countersMap.size>=W){this.droppedMetricKeys++;return}this.countersMap.set(e,(this.countersMap.get(e)??0)+t)}gauge(e,t){if(!this.gaugesMap.has(e)&&this.gaugesMap.size>=W){this.droppedMetricKeys++;return}this.gaugesMap.set(e,t)}sample(e){if(this.sampleList.length>=this.options.maxSamples){this.droppedSamplesValue++;return}this.sampleList.push(e),e.type==="memory"&&this.memorySamples.push(e)}warning(e,t){this.warningList.length>=Se||this.warningList.push({code:e,message:t,timestamp:p()})}addLongTask(e,t,s){const r=[...this.spansById.values()].filter(n=>n.startTime<e+t&&n.startTime+n.durationMs>e).map(n=>n.id),a={type:"long-task",timestamp:e,durationMs:f(t),name:s,overlapSpanIds:r.length>0?r:void 0};this.longTaskCount++,this.longTaskTotalMs+=t,this.longTaskLongestMs=Math.max(this.longTaskLongestMs,t),this.sample(a)}async addMemorySample(){const e=p();let t={};try{t=this.profiler.memoryProvider?.()??{}}catch{this.warning("memory-provider-failed","The deterministic memory provider failed and was omitted.")}const s={type:"memory",timestamp:e,deterministic:t},r=typeof performance<"u"?performance:null;try{if(typeof r?.measureUserAgentSpecificMemory=="function"){const a=await r.measureUserAgentSpecificMemory();s.browserHeap={bytes:Number(a.bytes),source:"measureUserAgentSpecificMemory",confidence:"estimated"}}else r?.memory?s.browserHeap={usedBytes:Number(r.memory.usedJSHeapSize),totalBytes:Number(r.memory.totalJSHeapSize),limitBytes:Number(r.memory.jsHeapSizeLimit),source:"performance.memory",confidence:"estimated"}:this.memoryCapabilityWarningIssued||(this.warning("memory-browser-api-unsupported","No browser heap measurement API is available; deterministic DeepThoughtEngine memory data was retained."),this.memoryCapabilityWarningIssued=!0)}catch{r?.memory?s.browserHeap={usedBytes:Number(r.memory.usedJSHeapSize),totalBytes:Number(r.memory.totalJSHeapSize),limitBytes:Number(r.memory.jsHeapSizeLimit),source:"performance.memory",confidence:"estimated"}:this.memorySampleWarningIssued||(this.warning("memory-sample-failed","The browser memory measurement failed and was omitted."),this.memorySampleWarningIssued=!0)}this.sample(s)}async stop(){return this.reportValue?this.reportValue:this.stopping?this.stopping:(this.stopping=this.finish(),this.stopping)}async finish(){this.memoryTimer&&(clearInterval(this.memoryTimer),this.memoryTimer=null),this.observer?.disconnect(),this.observer=null,this.options.captureMemory&&this.profiler.enabled&&(await Promise.allSettled([...this.memorySamplePromises]),await this.addMemorySample());const e=p();this.droppedMetricKeys>0&&this.warning("metric-key-limit",`${this.droppedMetricKeys} metric updates were dropped after the metric-key limit was reached.`);const t={};for(const i of Me)t[i]=(this.categoryAggregates.get(i)??new U).snapshot();const s={};for(const[i,o]of this.spanAggregates)s[i]=o.snapshot();const r=[...this.spansById.values()].sort((i,o)=>i.startTime-o.startTime),a=this.memorySamples.reduce((i,o)=>(o.browserHeap?.bytes??o.browserHeap?.usedBytes??0)>(i?.browserHeap?.bytes??i?.browserHeap?.usedBytes??0)?o:i,void 0),n=Ie({id:this.id,name:this.nameValue,startedAt:this.startedAt,durationMs:Math.max(0,e-this.startedAt),environment:this.profiler.environment,summary:{wallDurationMs:f(Math.max(0,e-this.startedAt)),instrumentedBusyDurationMs:f(this.busyDurationMs),categories:t,operations:s,topSpans:[...r].sort((i,o)=>o.durationMs-i.durationMs).slice(0,20),droppedSpans:this.droppedSpansValue,droppedSamples:this.droppedSamplesValue,longTasks:{count:this.longTaskCount,totalMs:f(this.longTaskTotalMs),longestMs:f(this.longTaskLongestMs)},peakMemory:a},spans:r,counters:Object.fromEntries(this.countersMap),gauges:Object.fromEntries(this.gaugesMap),samples:this.sampleList,warnings:this.warningList});return this.reportValue=n,this.profiler.finish(this),n}};function Ie(e){const t={version:1,...e};return Object.freeze({...t,spans:Object.freeze([...e.spans]),samples:Object.freeze([...e.samples]),warnings:Object.freeze([...e.warnings]),export(s){if(s==="json")return JSON.stringify(t,null,2);const r=e.startedAt,a=e.spans.map(n=>({name:n.name,cat:`deepthought.${n.category}`,ph:"X",ts:Math.round((n.startTime-r)*1e3),dur:Math.round(n.durationMs*1e3),pid:n.processId??1,tid:n.thread,args:n.metadata??{}}));for(const n of e.samples)n.type==="long-task"&&a.push({name:n.name??"browser.long-task",cat:"deepthought.browser",ph:"X",ts:Math.round((n.timestamp-r)*1e3),dur:Math.round(n.durationMs*1e3),pid:1,tid:"main",args:{overlapSpanIds:n.overlapSpanIds??[]}});for(const[n,i]of Object.entries(e.gauges))a.push({name:`deepthought.gauge.${n}`,cat:"deepthought.metrics",ph:"C",ts:Math.round((e.startedAt-r)*1e3),pid:1,tid:"main",args:{[n]:i}});for(const n of e.warnings)a.push({name:n.code,cat:"deepthought.warning",ph:"i",s:"t",ts:Math.round(((n.timestamp??e.startedAt)-r)*1e3),pid:1,tid:"main",args:{message:n.message}});return JSON.stringify({traceEvents:a},null,2)}})}let Pe,y,b,k,Le,E;Ke=class{enabled;level;options;environment;memoryProvider=null;active=null;constructor(e={}){this.enabled=e.enabled===!0,this.level=e.level??"timings",this.options={enabled:this.enabled,level:this.level,maxSpans:M(e.maxSpans,ge,1,1e6),maxSamples:M(e.maxSamples,we,1,1e5),slowSpanThresholdMs:M(e.slowSpanThresholdMs,be,0,6e4),memorySampleIntervalMs:M(e.memorySampleIntervalMs,ke,50,6e4),captureMemory:e.captureMemory===!0,captureLongTasks:e.captureLongTasks===!0,pathDetail:e.pathDetail??"basename",includeUrls:e.includeUrls===!0},this.environment={host:Ee(),userAgent:typeof navigator<"u"?navigator.userAgent:void 0,hardwareConcurrency:typeof navigator<"u"?navigator.hardwareConcurrency:void 0,crossOriginIsolated:typeof crossOriginIsolated=="boolean"?crossOriginIsolated:void 0,sharedArrayBuffer:typeof SharedArrayBuffer<"u",level:this.level}}setMemoryProvider(e){this.memoryProvider=e}start(e){if(this.active)throw new Error("DeepThoughtEngine profiler already has an active session");const t=new xe(this,e);return this.active=t,this.enabled?this.level!=="counters"&&t.warning("busy-duration-overlap","Instrumented busy durations may overlap and must not be interpreted as CPU time."):t.warning("profiler-disabled","Profiling is disabled; this session contains no instrumentation data."),this.options.pathDetail==="full"&&t.warning("unredacted-paths","This report may contain unredacted file paths."),t}profile(e,t){const s=this.start(e);return Promise.resolve().then(t).then(async r=>({result:r,report:await s.stop()})).finally(async()=>{await s.stop()})}begin(e,t){return this.active&&this.enabled?this.active.begin(e,t):null}end(e){return this.active&&this.enabled?this.active.end(e):0}recordSpan(e,t,s,r){this.active&&this.enabled&&this.active.recordSpan(e,t,s,r)}count(e,t=1){this.active&&this.enabled&&this.active.count(e,t)}gauge(e,t){this.active&&this.enabled&&this.active.gauge(e,t)}sample(e){this.active&&this.enabled&&this.active.sample(e)}finish(e){this.active===e&&(this.active=null)}};Pe=class{queue=[];pool;dispatching=!1;constructor(e){this.pool=e}submit(e){return new Promise((t,s)=>{const r={task:e,resolve:t,reject:s,cancelled:!1},a=this.queue.findIndex(n=>n.task.priority>e.priority);a===-1?this.queue.push(r):this.queue.splice(a,0,r),this.dispatch()})}submitBatch(e){return Promise.all(e.map(t=>this.submit(t)))}cancel(e){const t=this.queue.findIndex(s=>s.task.id===e&&!s.cancelled);if(t>=0){const s=this.queue[t];return s.cancelled=!0,s.reject(new Error(`Task ${e} cancelled`)),this.queue.splice(t,1),!0}return!1}get pending(){return this.queue.length}async dispatch(){if(!this.dispatching){this.dispatching=!0;try{for(;this.queue.length>0;){const e=this.queue.shift();if(e.cancelled)continue;let t,s;try{const r=await this.pool.acquire();t=r.worker,s=r.release}catch(r){const a=r instanceof Error?r:new Error(String(r));e.reject(a),this.rejectAll(a);return}this.executeTask(t.endpoint,e,t.id).finally(()=>{s(),this.queue.length>0&&(this.dispatching=!1,this.dispatch())})}}finally{this.dispatching=!1}}}rejectAll(e){const t=this.queue.splice(0);for(const s of t)s.cancelled||s.reject(e)}async executeTask(e,t,s){if(!t.cancelled)try{const r=t.task.profiling,a=r?p():void 0;r&&a!==void 0&&(r.dispatchedAt=a);const n=r?p():void 0;r&&n!==void 0&&(r.startedAt=n,r.workerId=s);let i;switch(t.task.type){case"transform":i=await e.transform(t.task);break;case"transformBatch":i=await e.transformBatch(t.task);break;case"extract":i=await e.extract(t.task.streamPort?J(t.task,[t.task.streamPort]):t.task);break;case"build":i=await e.build(t.task);break;default:throw new Error(`Unknown task type: ${t.task.type}`)}if(r){const o=p();r.completedAt=o,r.receivedAt=o,i.profiling={...r}}t.cancelled||t.resolve(i)}catch(r){t.cancelled||t.reject(r instanceof Error?r:new Error(String(r)))}}};Ge=(function(e){return e[e.HIGH=0]="HIGH",e[e.NORMAL=1]="NORMAL",e[e.LOW=2]="LOW",e})({});y=null;b=null;k=!1;E=1;function Oe(){return typeof Worker<"u"&&typeof Blob<"u"&&typeof URL<"u"&&typeof URL.createObjectURL=="function"}function Be(){if(b)return b;if(!Oe())throw k=!0,new Error("Workers not available");return y=new ye(Le),b=new Pe(y),b}async function Ue(e){const{convertFileDirect:t,patchBuiltinImports:s,prepareTransformer:r}=await import("./module-transformer-Dv3pQY3p.js").then(n=>n.n);await r();const a=s(await t(e.source,e.filePath));return{type:"transform",id:e.id,code:a,warnings:[]}}async function Ce(e){const{convertFileDirect:t,patchBuiltinImports:s,prepareTransformer:r}=await import("./module-transformer-Dv3pQY3p.js").then(n=>n.n);await r();const a=await Promise.all(e.files.map(async n=>{try{const i=s(await t(n.source,n.filePath));return{filePath:n.filePath,code:i,warnings:[]}}catch(i){return{filePath:n.filePath,code:n.source,warnings:[i instanceof Error?i.message:String(i)]}}}));return{type:"transformBatch",id:e.id,results:a}}async function _e(e){const t=await import("./pako.esm-DQUXHgNn.js").then(l=>l.n),{parseTarArchive:s}=await import("./archive-extractor-B40pNYD_.js").then(l=>l.t),{bytesToBase64:r}=await import("./byte-encoding-DY8VFsBe.js").then(l=>l.n);let a;if(e.tarballBytes&&e.tarballBytes.byteLength>0)a=new Uint8Array(e.tarballBytes);else{const l=await fetch(e.tarballUrl);if(!l.ok)throw new Error(`Archive download failed (HTTP ${l.status}): ${e.tarballUrl}`);a=new Uint8Array(await l.arrayBuffer())}const n=t.inflate(a),i=[];for(const l of s(n)){if(l.kind!=="file"||!l.payload)continue;let c=l.filepath;if(e.stripComponents>0){const u=c.split("/").filter(Boolean);if(u.length<=e.stripComponents)continue;c=u.slice(e.stripComponents).join("/")}i.push({path:c,data:new Uint8Array(l.payload),isBinary:!0})}const o={type:"extract",id:e.id,files:i};return e.wantTarball&&(o.tarballBytes=a.buffer instanceof ArrayBuffer&&a.byteLength===a.buffer.byteLength?a.buffer:a.slice().buffer),o}async function Re(e){const t=await import("./host-DYc69tNt.js").then(async m=>{await m.__tla;return m}).then(s=>s.J);try{const s=await t.build({entryPoints:e.entryPoints,stdin:e.stdin,bundle:e.bundle,format:e.format,platform:e.platform,target:e.target,minify:e.minify,external:e.external,write:!1,absWorkingDir:e.absWorkingDir});return{type:"build",id:e.id,outputFiles:(s.outputFiles||[]).map(r=>({path:r.path,text:r.text||new TextDecoder().decode(r.contents)})),errors:(s.errors||[]).map(r=>r.text||String(r)),warnings:(s.warnings||[]).map(r=>r.text||String(r))}}catch(s){return{type:"build",id:e.id,outputFiles:[],errors:[s?.message||"build failed"],warnings:[]}}}qe=function(){const e=E;return E=E>=Number.MAX_SAFE_INTEGER?1:E+1,e};ze=async function(e){if(k)return F(e);try{return await Be().submit(e)}catch(t){return k||console.debug("[offload] Falling back to main thread:",t instanceof Error?t.message:t),We(),F(e)}};Xe=async function(e,t){const s=t.begin(`workers.${e.type}`,{category:"workers",metadata:{taskId:e.id}}),r={...e,profiling:{createdAt:p()}};try{const a=await ze(r);t.count("workers.tasks");const n=a.profiling;return n?.dispatchedAt!==void 0&&t.recordSpan("workers.queue",n.createdAt,n.dispatchedAt,{category:"workers",thread:`worker-${n.workerId??"unknown"}`}),n?.startedAt!==void 0&&n.completedAt!==void 0&&t.recordSpan("workers.execution",n.startedAt,n.completedAt,{category:"workers",thread:`worker-${n.workerId??"unknown"}`}),n?.dispatchedAt!==void 0&&n.startedAt!==void 0&&t.recordSpan("workers.transfer.to",n.dispatchedAt,n.startedAt,{category:"workers",thread:`worker-${n.workerId??"unknown"}`}),n?.completedAt!==void 0&&n.receivedAt!==void 0&&t.recordSpan("workers.transfer.from",n.completedAt,n.receivedAt,{category:"workers",thread:`worker-${n.workerId??"unknown"}`}),a}finally{t.end(s)}};function We(){k=!0,y&&(y.dispose(),y=null),b=null}async function F(e){switch(e.type){case"transform":return Ue(e);case"transformBatch":return Ce(e);case"extract":return _e(e);case"build":return Re(e);default:throw new Error(`Unknown task type: ${e.type}`)}}Je=function(){return{...y?.stats()??{total:0,busy:0,idle:0,initialized:0},fallback:k}};Qe=function(){b=null,y?.dispose(),y=null,k=!1}})();export{qe as a,de as c,_ as d,Ne as f,Xe as i,G as l,He as m,ze as n,Ge as o,$e as p,Je as r,Ke as s,Qe as t,Ve as u,__tla};