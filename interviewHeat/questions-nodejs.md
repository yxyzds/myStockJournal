# Node.js — 20 Interview Questions

Mid-to-senior frontend / BFF. Cover these without looking at `answers-nodejs.md`. Assume current LTS unless a question names a version. Aim for: what the runtime does, what breaks in production, and what you would ship.

---

## 1. Node’s event loop vs the browser

How does Node’s event loop differ from the browser’s (phases, `process.nextTick`, `setImmediate`, `setTimeout(0)`)? Predict the log order and explain why:

```js
console.log('A');
setTimeout(() => console.log('B'), 0);
setImmediate(() => console.log('C'));
process.nextTick(() => console.log('D'));
Promise.resolve().then(() => console.log('E'));
console.log('F');
```

When is `nextTick` starvation a real bug?

## 2. Blocking the event loop

What counts as “blocking” in Node? Why can `JSON.parse` of a 50MB payload, a sync `fs.readFileSync` in a request handler, and a tight `while` loop all take down an HTTP server that has many clients? How would you find a blocked loop in production, and what are legitimate uses of the `worker_threads` vs `child_process` vs offloading to a queue?

## 3. Modules: CommonJS vs ESM in Node

Compare `require` vs `import`: loading, live bindings, `this`, `__dirname`, top-level await, and circular dependencies. What do `"type": "module"`, `.mjs`, `.cjs`, and `exports` in `package.json` do? Why does `require()` of a pure ESM package throw, and how do dual-package hazards (`module` vs `main`) bite frontend tooling?

## 4. `Buffer`, strings, and encodings

What is a `Buffer`? When must you *not* concatenate binary with strings? Explain `Buffer.alloc` vs `allocUnsafe` vs `from`. Predict a bug:

```js
const chunks = [];
req.on('data', (c) => chunks.push(c));
req.on('end', () => {
  const body = chunks.join(''); // or Buffer.concat?
  JSON.parse(body);
});
```

How do you cap request body size, and why does encoding `utf8` vs `base64` vs `hex` matter for JWTs and file uploads?

## 5. Streams and backpressure

Explain readable / writable / duplex / transform streams and **backpressure** (`pipe`, `write` returning `false`, `drain`). Why is buffering an entire file in memory a problem, and when is `pipeline()` (or `stream/promises`) required instead of `.pipe()`? How would you stream a file download with correct error handling and cleanup?

## 6. `fs`: sync, callback, promises, and `fs.watch`

When is sync `fs` acceptable (CLI startup, one-shot scripts) vs forbidden (request path)? Difference between `readFile` and `createReadStream`. Pitfalls of `fs.watch` / `watchFile` across OSes. How do you avoid TOCTOU / path traversal when serving files from user input (`path.join`, `path.normalize`, `realpath`)?

## 7. HTTP: `http`/`https` core vs Express / Fastify

What does Node’s `http.createServer` give you, and what do frameworks add? How do you parse JSON bodies safely (size limit, content-type)? Contrast Express middleware vs Fastify plugins / encapsulation. What is a hanging request, and how do timeouts (`headersTimeout`, `requestTimeout`, `server.timeout`) differ?

## 8. Error handling: callbacks, Promises, and process events

How should a library expose errors in 2026 (callbacks vs Promises)? What is the difference between operational errors and programmer errors? What do `uncaughtException` and `unhandledRejection` mean, and why is “log and continue” after `uncaughtException` dangerous? How do you make sure an `async` request handler’s rejection becomes a 500 instead of a crash?

## 9. `EventEmitter` and memory leaks

How does `EventEmitter` work? What is `error` event special-casing? Why does this leak, and how do you fix it?

```js
emitter.on('tick', () => { /* per request */ });
```

What are `AbortSignal` / `EventTarget` doing in modern Node APIs compared to emitters? `MaxListenersExceededWarning` — ignore or fix?

## 10. Child processes vs worker threads vs cluster vs PM2

Compare `child_process` (`spawn` / `exec` / `fork`), `worker_threads`, and `cluster`. Which shares memory? Which is right for: image resize CPU work, running `ffmpeg`, scaling an Express server, a crash-isolated plugin? What IPC looks like (messages vs stdin). Why is `exec` with string interpolation a security bug?

## 11. `process`, env, and 12-factor config

What belongs in `process.env` vs flags vs files? Why is reading `process.env.FOO` everywhere hard to test? How do you avoid leaking secrets in logs and client bundles (BFF)? Difference between `process.exit(1)` and letting the event loop drain. What are `SIGINT`/`SIGTERM` handlers for in Docker/K8s, and what is a graceful shutdown sequence for HTTP + DB?

## 12. AsyncLocalStorage and request context

What problem does `AsyncLocalStorage` solve (request id, auth, transactions) that a global or `Error.stack` hack does not? How does it relate to `async_hooks`? Pitfalls: performance, lost context across native callbacks / third-party pools, and storing large objects. When would you pass `req` explicitly instead?

## 13. Crypto, hashing, and secrets in Node

When do you use `crypto.randomBytes` vs `Math.random`? `timingSafeEqual` — why? Hash vs HMAC vs password KDF (`scrypt` / `argon2`). Why is `md5`/`sha1` wrong for passwords? How do you store API keys and rotate them in a Node BFF? What is a common JWT verification mistake (`alg: none`, not checking `iss`/`aud`/`exp`)?

## 14. Security on the Node side of a frontend app

Name and mitigate: prototype pollution, path traversal, SSRF from a URL-fetching BFF, `eval`/`vm` with user input, HTTP header injection, open redirects, dependency typosquatting. Why is `cors()` with `origin: true` / reflecting any Origin dangerous? How should you handle `child_process` and template rendering of user HTML?

## 15. `package.json`, lockfiles, and the module resolution algorithm

Explain `dependencies` vs `devDependencies` vs `peerDependencies` vs `optionalDependencies`. Why do lockfiles matter in CI? What does Node’s resolution algorithm do with `node_modules` hoisting, and how do pnpm’s symlinks change that? `exports` field: what is the purpose of `"import"` / `"require"` / `"types"` conditions? What is a phantom dependency?

## 16. Testing Node: unit, integration, and HTTP

How do you test a Fastify/Express handler without listening on a port? What do you mock (network, time, `fs`) and what do you not? `node:test` vs Jest vs Vitest in a Node context. How do you test graceful shutdown and timeouts? Why are real timers + real network in unit tests a smell?

## 17. Observability: logging, metrics, and traces

Why is `console.log` insufficient in production? Structured JSON logs: request id, error `cause`, no PII. How do OpenTelemetry traces propagate across `fetch` and EventEmitter? What metrics would you expose for an API (latency histogram, event-loop delay, heap, active handles)? How does `perf_hooks.monitorEventLoopDelay` help?

## 18. Memory: heap, native, and leaks in long-running Node

What shows up in `process.memoryUsage()` (`rss` vs `heapUsed` vs `external` vs `arrayBuffers`)? Typical leaks: caches without bounds, EventEmitter, closures over `req`, global arrays, uncleared `setInterval`, native buffers. How do you take a heap snapshot in production safely? When is `Buffer` / `fetch` body counted as `external`?

## 19. Undici / `fetch` in Node and HTTP clients

Node’s global `fetch` (Undici): what is an `Agent` / connection pool, and why do you need timeouts (`AbortSignal.timeout`) on outbound calls? Difference between retrying GET vs POST. How do you prevent connection pile-up to a slow dependency? `keepAlive`, DNS, and IPv6 pitfalls (`localhost` → `::1` vs `127.0.0.1`).

## 20. Building a BFF: architecture questions interviewers actually ask

You own a Node BFF in front of 4 downstream services for a React app. How do you: authenticate (session cookie vs JWT in header), aggregate without a waterfall, cache (HTTP cache vs Redis vs in-memory), handle partial failure, cancel when the browser aborts, and version the API? When would you skip Node and call APIs from the browser or from Next.js Server Components instead?
