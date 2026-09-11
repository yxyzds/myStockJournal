# Node.js — Answers

Numbered to match `questions-nodejs.md`. Use these after attempting the questions.

---

## 1. Node’s event loop vs the browser

Both drain a **microtask** queue (Promises, `queueMicrotask`) after each JS turn. Node additionally has **libuv phases**: timers → pending → idle/prepare → **poll** (I/O) → **check** (`setImmediate`) → close callbacks. Between many of these, Node runs **`process.nextTick` then microtasks**.

`nextTick` is **not** a libuv phase; it runs as soon as the current operation finishes, **before** the next phase and before Promises scheduled from that same turn in some cases — actually: after the current function, **nextTick queue is drained before Promises** historically. Order:

**Typical order:** `A`, `F`, `D`, `E`, then `B` vs `C` **depends on context**.

- Sync: `A`, `F`
- `nextTick`: `D`
- Promise microtask: `E`
- Then timers vs check: if this code runs **inside an I/O callback**, `setImmediate` (`C`) often runs before `setTimeout(0)` (`B`). If it runs in the **main module**, timers and immediates race; you may see `B` then `C` or the reverse. **Do not claim a universal `B`/`C` order** — say it is **non-portable** and use `nextTick` / Promises for “after this turn,” `setImmediate` for “after I/O phase,” timers for real delays.

**Starvation:** a `nextTick` that keeps scheduling `nextTick` never reaches poll/timers — I/O and timeouts freeze. Same with an infinite `Promise.then` chain. Yield with `setImmediate` or `setTimeout(0)` for chunked work.

---

## 2. Blocking the event loop

Node is **one JS thread** (plus a libuv threadpool for some fs/crypto/DNS). CPU-heavy or **synchronous** work stops **all** request handling on that process.

- `readFileSync` in a handler: every other connection waits.
- `JSON.parse` huge payload: CPU stall (still JS thread).
- `while (Date.now() ...)` : hard freeze.

Find it: `nodejs` event-loop delay metrics, `clinic doctor` / `0x`, `perf_hooks.monitorEventLoopDelay`, APM “event loop blocked.” CPU profiles show the hot function.

| Tool | Use |
|---|---|
| `worker_threads` | CPU in-process (image, crypto, parse); shared `SharedArrayBuffer` optional |
| `child_process` | isolate crashes, run binaries (`ffmpeg`), other languages |
| Job queue | bursty/heavy work, retries, don’t block HTTP at all |

Threadpool saturation (`UV_THREADPOOL_SIZE`, default 4) can stall `fs`/`dns`/`crypto.pbkdf2` even if JS looks idle.

---

## 3. Modules: CommonJS vs ESM in Node

| | CJS | ESM |
|---|---|---|
| Load | sync `require` | async graph, `import` |
| Exports | `module.exports` copy | live bindings |
| Meta | `__dirname`, `__filename` | `import.meta.url` → `fileURLToPath` |
| TLA | no | top-level `await` |
| Cycles | partial `exports` object | TDZ on live bindings |

`"type": "module"` makes `.js` ESM. `.mjs` ESM always; `.cjs` CJS always. `package.json` `"exports"` is the **public API map** (blocks deep imports).

`require(esm)` threw until recent Node experimental/sync-require stories — **in interviews:** native ESM often cannot be `require`d; use `import()` (returns a Promise) or dual publish.

**Dual package hazard:** `import` and `require` get **two copies** of a singleton (two Reacts, two contexts). Align `exports.import` / `exports.require` to the same file or document “ESM only.” Frontend bundlers reading `"module"` vs Node `"main"` caused years of “works in Vite, fails in Node.”

---

## 4. `Buffer`, strings, and encodings

A `Buffer` is a fixed-size chunk of **binary** (Uint8Array subclass). Strings are UTF-16 internally; mixing with binary **re-encodes** and can corrupt UTF-8 split across chunks.

- `alloc(n)` — zeroed, safe.
- `allocUnsafe(n)` — maybe old heap data; faster; don’t return to users without overwrite.
- `from(str, enc)` / `from(array)`.

**Bug:** `chunks.join('')` **coerces each Buffer to utf8 string**, then concatenates. A multibyte character split across TCP packets becomes **invalid JSON / mojibake**. Correct: `Buffer.concat(chunks)` then `JSON.parse(buf.toString('utf8'))`, or a length-capped parser (`busboy` for multipart).

Cap body size (e.g. 1mb) or an attacker fills memory. JWT is **base64url**, not utf8 JSON in the token’s binary form. Uploads: never `toString('utf8')` on a PNG.

---

## 5. Streams and backpressure

- **Readable:** data source (`fs.createReadStream`, `req`).
- **Writable:** sink (`res`, file).
- **Duplex:** both (sockets).
- **Transform:** hash, gzip.

If the writable is slower, `write()` returns `false` — you must pause the readable until `drain`. `.pipe()` handles this. **`pipeline(src, ...transforms, dest)`** forwards errors and destroys streams; raw `.pipe()` **does not** auto-destroy on error well (memory / fd leaks). Prefer `stream/promises.pipeline`.

Streaming download: `pipeline(fs.createReadStream(path), res)` with `Content-Type` / `Content-Length` or chunked; `try/catch` around `await pipeline`; destroy on client abort (`req.on('close')` / `AbortSignal`).

---

## 6. `fs`: sync, callback, promises, and `fs.watch`

Sync: CLI, boot config, **not** per-request. `readFile` loads all; `createReadStream` for large files.

`fs.watch` is **OS-dependent** (kqueue vs inotify vs Windows); events duplicate or drop; `watchFile` polls (CPU). Use `chokidar` in tools; don’t rely on watch in a server for correctness.

**Path traversal:** `path.join(root, userPath)` with `../../etc/passwd`. Fix: resolve `realpath`, then `relative.startsWith('..')` or `resolved === root || resolved.startsWith(root + sep)`. Never trust `content-disposition` filenames. TOCTOU: `exists` then `open` can race; `open` with flags and handle `ENOENT`.

---

## 7. HTTP: `http`/`https` core vs Express / Fastify

Core: `IncomingMessage` (readable) + `ServerResponse` (writable). You own routing, parse, errors.

Frameworks: routing, schema, plugins, serialization. **Express:** linear middleware, mutable `req`. **Fastify:** encapsulated plugins, JSON schema, faster serialize, `onRequest` hooks.

JSON: check `Content-Type`, `limit` bytes, then parse; don’t `JSON.parse` unbounded strings.

Hanging: client paused, handler never `res.end()`. Timeouts:

- `headersTimeout` — time to send headers
- `requestTimeout` (newer) — whole request
- `server.timeout` — idle socket
- app-level abort for downstream `fetch`

Always `res.on('close')` to cancel work.

---

## 8. Error handling: callbacks, Promises, and process events

Libraries: **Promises / async** + typed errors (`err.code`). Callbacks only for streams/EventEmitter compatibility. Don’t mix “sometimes throw, sometimes callback.”

**Operational:** network down, 404, validation — handle, log, continue.  
**Programmer:** `undefined` is not a function — fail the request / crash in dev.

`unhandledRejection`: a Promise rejected with no `catch` — Node may warn then (historically) crash. Always attach `.catch` or `await` in an outer try.

`uncaughtException`: the process is **undefined** (invariants broken). Log, **exit**, let the supervisor restart. Do not keep serving HTTP.

Express: wrap `async (req, res, next) => { try { await ... } catch (e) { next(e); } }` or `express-async-errors` style. Fastify: async handlers reject → 500 automatically if you don’t catch.

---

## 9. `EventEmitter` and memory leaks

`on` / `emit` / `once` / `off`. If you `emit('error')` and **nobody** listens, Node **throws**. Always `on('error')` on streams.

**Leak:** adding a listener **per request** on a **process-wide** emitter and never `off`. The closure retains `req`/`res` → heap grows.

Fix: `once`, `off` in `finally`, or `AbortSignal` (`addEventListener(..., { signal })`). Prefer `EventTarget` + `AbortController` in new APIs (`fs`, `fetch`).

`MaxListenersExceededWarning` (default 10) is almost always a **real leak**, not a limit to raise blindly.

---

## 10. Child processes vs worker threads vs cluster vs PM2

| | Memory | Best for |
|---|---|---|
| `worker_threads` | same process, isolated isolates; can share SAB | CPU-bound JS |
| `spawn` | separate process | binaries, streaming stdio |
| `exec` | buffers **all** stdout — **don’t** for large output; **never** `exec('ls ' + user)` → injection; use `execFile` with argv array |
| `fork` | Node child + IPC | old cluster workers |
| `cluster` | many Node processes, round-robin sockets | multi-core HTTP (or just run N containers) |
| PM2 / K8s | process manager | restart, logs — not a substitute for app-level graceful shutdown |

Image resize: worker or `sharp` (native). `ffmpeg`: `spawn`. Scale HTTP: multiple Node processes **behind** a load balancer; `cluster` is optional. Crash-isolated plugin: `child_process`.

---

## 11. `process`, env, and 12-factor config

Env: secrets and per-environment URLs. Typed config module parsed **once** at boot (`zod`), tests inject a fake config. Don’t scatter `process.env`.

Never log `Authorization`, cookies, or env dumps. BFF must not put secrets in JSON sent to the browser.

`process.exit(1)` **skips** `finally`, unfinished I/O, access logs. Prefer: stop taking connections, drain, then `exit`.

**SIGTERM** (K8s): `server.close()`, refuse new connections, wait in-flight (with a deadline), close DB, `process.exit(0)`. Handle `SIGINT` for local Ctrl+C. `keepAlive` sockets need `server.closeIdleConnections()` (Node 18.2+) or they block `close`.

---

## 12. AsyncLocalStorage and request context

ALS stores a store **per async chain** so `getStore()` in a logger deep in the stack still sees `{ requestId, userId }` without passing `req` through 15 functions.

Built on `async_hooks`. Cost: not free; don’t put huge objects in the store (they live as long as pending async work).

Context can be **lost** across some native addons, poorly promisified APIs, or worker boundaries. Test that `fetch` / `setTimeout` still see the store (they should in modern Node).

Passing `req` is clearer for small apps; ALS shines in middleware-heavy BFFs and OpenTelemetry.

---

## 13. Crypto, hashing, and secrets in Node

`Math.random` is **not** CSPRNG. Tokens, IDs, session secrets: `crypto.randomBytes` / `randomUUID`.

`timingSafeEqual`: compare hashes/MACs without leaking length-time (buffers **must** be same length — hash first).

Passwords: **KDF** (`scrypt`, `argon2`) with unique salt — not `sha256(password)`. HMAC: API request signing. `md5`/`sha1`: broken for security; OK for non-security checksums (even then prefer `sha256`).

API keys: secret manager / env, rotate, never in git. JWT: use a library; **pin algorithm** (reject `none`); validate `exp`, `iss`, `aud`; short-lived access tokens; don’t put secrets in JWT payload (it’s readable).

---

## 14. Security on the Node side of a frontend app

| Issue | Mitigation |
|---|---|
| Prototype pollution | `Object.create(null)`, freeze, don’t `merge` user JSON into `{}` blindly; update lodash |
| Path traversal | Q6 |
| SSRF | allowlist hosts; block link-local/metadata IPs; no user-controlled `fetch(url)` |
| `eval` / `vm` | don’t run user JS; if you must, isolate process + tiny timeout |
| Header injection | don’t put raw user strings in `res.setHeader` |
| Open redirect | allowlist paths |
| Typosquatting | lockfile, ignore-scripts in CI if possible, audit |
| CORS `origin: true` | reflects any Origin + credentials → any site can call you with cookies; allowlist |

`child_process`: `execFile` + argv. User HTML: don’t `res.send(userHtml)`; sanitize or only JSON.

---

## 15. `package.json`, lockfiles, and the module resolution algorithm

- `dependencies`: runtime.
- `devDependencies`: tests, types, bundlers — not installed with `npm i --omit=dev` in prod images (keep `typescript` out of prod if unused).
- `peerDependencies`: “you must provide React”; version alignment.
- `optionalDependencies`: allowed to fail (native extras).

Lockfiles: **reproducible** CI/prod; commit them. Hoisting: npm/yarn may lift `A`’s dep `B` to the root so `C` can accidentally `require('B')` — **phantom dependency** (breaks under pnpm). pnpm uses a content-addressable store + symlinks; undeclared imports fail (good).

`"exports"`: map `.` to published files; `"import"`/`"require"` conditions for dual packages; `"types"` for TS. Without `exports`, consumers import internal `src/` and you can never move files.

---

## 16. Testing Node: unit, integration, and HTTP

Inject `app` and `inject()` (Fastify) or `supertest(app)` **without** `listen`. Assert status, headers, body.

Mock: downstream HTTP (`nock` / MSW / Undici MockAgent), clock (`fake timers`) for timeouts, `fs` only if the unit is not “does the OS work.” Don’t mock your own DB in an integration test if the point is SQL.

`node:test` is built-in; Vitest/Jest if the repo is already TS/frontend-aligned. Same process vs worker isolation (Jest) matters for module singleton tests.

Graceful shutdown: fake `SIGTERM`, assert `close` called, in-flight request finishes or is 503. Real 30s sleeps in unit tests are a smell — fake timers + unit-sized timeouts.

---

## 17. Observability: logging, metrics, and traces

`console.log` is unstructured, no level, can block (sync tty), no request correlation.

JSON logs: `{ level, msg, requestId, err: { message, code, stack, cause } }`. Redact tokens. `pino` is the usual Node choice.

OTel: W3C `traceparent` on inbound/outbound `fetch`. EventEmitters don’t propagate context unless you bind ALS.

Metrics: RED (rate, errors, duration histogram), Node: `event_loop_delay`, `heapUsed`, `active_handles`, GC. `monitorEventLoopDelay` → p99 delay; if it climbs, you are blocking or overloaded.

---

## 18. Memory: heap, native, and leaks in long-running Node

- `rss` — whole process (V8 + native + stacks).
- `heapUsed` / `heapTotal` — V8 JS heap.
- `external` — C++ bound to JS (some Buffers).
- `arrayBuffers` — ArrayBuffer backing stores.

Leaks: unbounded `Map` caches, per-request `on` without `off`, `req` in a module-level array, `setInterval` in a plugin init twice, growing `Buffer` lists.

Snapshots: `kill -USR2` + inspector, or `heapdump` — **STW**, do it on a replica, not the only prod box under load. Compare snapshots; look for `IncomingMessage` / closures.

Large `fetch` bodies / Buffers often sit in **external**/arrayBuffers — a leak may not look like JS objects.

---

## 19. Undici / `fetch` in Node and HTTP clients

Global `fetch` uses **Undici** with a connection pool per origin. Without timeouts, a hung peer fills the pool → **your** API hangs.

Always: `fetch(url, { signal: AbortSignal.timeout(5_000), dispatcher })`. Bound sockets (`connections`). Retry **idempotent** GET/PUT with backoff; **don’t** retry POST unless the API is idempotent (Idempotency-Key).

Pile-up: timeouts + circuit breaker + bounded concurrency (`p-limit`). `keepAlive` is on by default in Undici — good; still cap.

DNS: `localhost` may be `::1` while the server listens on `127.0.0.1` only → `ECONNREFUSED`. Be explicit in Docker (`127.0.0.1` vs service names).

---

## 20. Building a BFF: architecture questions interviewers actually ask

**Auth:** browser → **httpOnly SameSite cookie** to BFF; BFF attaches service tokens to downstream. Avoid storing long-lived JWTs in `localStorage`.

**Aggregate:** `Promise.all` independent calls; start independent fetches before `await`; optional DataLoader for N+1. Don’t waterfall 4 serial services if they don’t depend.

**Cache:** `Cache-Control` for public GETs; Redis for shared session/user profile; **in-memory** only with TTL + cap (multi-instance inconsistency). Don’t cache personalized responses as public.

**Partial failure:** return 207-style payload `{ user, recos: null, recosError }` or fail the whole page — product choice; never hang on one slow service (timeouts).

**Cancel:** forward `req.signal` / client disconnect to downstream `fetch` abort.

**Version:** `/v1` or header; additive changes.

**Skip Node BFF when:** Next.js RSC can fetch on the server with secrets already; or the client talks to a public, CORS-safe, user-scoped API. Keep a BFF when you must hide keys, aggregate, or cookie-session a legacy backend.
