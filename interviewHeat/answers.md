# JavaScript Fundamentals — Answers

Numbered to match `questions.md`. Use these after attempting the questions.

---

## 1. Closures and lifetime

A **closure** is a function plus the lexical environment it was created in. It retains references to outer bindings (variables), not snapshots of their values at creation time — unless you captured a primitive copy yourself.

Those bindings live as long as **any reachable function** still closes over them. The GC can collect the outer frame only when no closure (and no other root) points at it. Engines may optimize unused bindings away, but you must not rely on that for correctness.

**Common UI bug:** a `setInterval` / `addEventListener` / React `useEffect` callback closes over **stale state** or a large object (a whole list, a DOM node, a previous response). The timer/listener keeps the closure alive → stale UI or a leak. In loops with `var`, every handler shares one `i`.

**Prevention:** capture the value you need (`const current = id`), use `let` in loops, return a cleanup that `clearInterval` / `removeEventListener` / `AbortController.abort()`, and in React list the right effect deps or read from a ref when you intentionally want the latest value.

---

## 2. `var` / `let` / `const`, TDZ, and hoisting

| | `var` | `let` / `const` |
|---|---|---|
| Scope | Function (or global) | Block |
| Hoisting | Binding + initialization to `undefined` | Binding is hoisted; **not** initialized |
| TDZ | No | Yes — access before init throws `ReferenceError` |
| Re-declare | Allowed in same scope | Syntax error |
| `const` | — | Must init; binding immutable, object contents still mutable |

Snippet:

- `console.log(a)` logs **`undefined`** (`var a` is hoisted and initialized).
- `console.log(b)` throws **`ReferenceError`** (`b` is in the TDZ until `let b = 2`).

`typeof` on an undeclared identifier is `'undefined'`; `typeof` on a TDZ `let` still throws.

---

## 3. `this` binding

Rules, highest-priority first in practice:

1. **Arrow functions:** no own `this`; lexical `this` from enclosing non-arrow (or module/global).
2. **`new`:** `this` is the newly created object (unless constructor returns an object).
3. **Explicit:** `fn.call/apply/bind(thisArg)`.
4. **Implicit:** `obj.method()` → `this === obj`.
5. **Default:** standalone call → `undefined` in strict mode / ES modules; global object in sloppy scripts.

Snippet (typical **strict / ESM / Node**):

- `obj.regular()` → `1` (implicit).
- `obj.arrow()` → `undefined` (arrow closed over outer `this`, not `obj`).
- `obj.nested()` → `1` (inner arrow inherits `nested`’s `this`, which is `obj`).
- `fn()` → `undefined` (lost implicit binding); in sloppy browser global, may read `window.n`.

---

## 4. Prototype chain vs class

`class Foo extends Bar` is mostly sugar:

- `Foo.prototype` holds instance methods.
- `Foo` (the function) holds statics; `Object.getPrototypeOf(Foo) === Bar`.
- Instances: `Object.getPrototypeOf(instance) === Foo.prototype`.
- `super.method()` in an instance method calls `Bar.prototype.method` with the same `this`.
- `super()` in a constructor runs `Bar` and binds `this` (derived classes cannot use `this` before `super()`).

**Own vs inherited:** own = on the object (`hasOwn`); inherited = found by walking `[[Prototype]]`.

**`instanceof`:** `obj instanceof Ctor` checks whether `Ctor.prototype` appears on `obj`’s prototype chain. It **lies** across realms/iframes (`iframeArray instanceof Array === false`), with a broken `prototype` assignment, or if `Symbol.hasInstance` is customized.

---

## 5. `new` and constructors

`new Ctor(args)` approximately:

1. Create `{}` with `[[Prototype]] = Ctor.prototype`.
2. Call `Ctor` with `this` bound to that object.
3. If the call returns an **object** (including functions), that value is the result.
4. If it returns a **primitive** or nothing, the created object is the result.

Forgetting `new` on a classic constructor: `this` is global/`undefined`, properties leak or throw. **ES6 classes** always run in strict mode and throw `TypeError` if called without `new`.

---

## 6. Equality and coercion

- `===`: same type and value; `NaN !== NaN`; `+0 === -0`.
- `==`: ToNumber/ToPrimitive coercions; **`null == undefined` only** (and vice versa); never coerce `null`/`undefined` to 0 here.
- `Object.is`: like `===` but `Object.is(NaN, NaN) === true` and `Object.is(+0, -0) === false`.

Predictions:

| Expression | Result | Why (short) |
|---|---|---|
| `[] == ![]` | `true` | `![]` is `false`; `[] == false` → `'' == 0` → `0 == 0` |
| `[] == false` | `true` | same |
| `[1] == true` | `true` | `[1]` → `'1'` → `1`; `true` → `1` |
| `null == undefined` | `true` | spec exception |
| `NaN === NaN` | `false` | IEEE / spec |
| `Object.is(NaN, NaN)` | `true` | SameValue |
| `0 === -0` | `true` | SameValueZero for `===` |
| `Object.is(0, -0)` | `false` | SameValue |

Prefer `===` / `Object.is` in app code. Know `==` for interviews and for `x == null` as an intentional nullish check.

---

## 7. Types, boxing, and primitives

Primitives (`string`, `number`, `boolean`, `bigint`, `symbol`, `undefined`, `null`) are not objects. Property access **temporarily boxes** them (`new String('hi')` equivalent), calls the method, then discards the wrapper. Explicit `new String('hi')` is a real object and is almost never what you want (`typeof` is `'object'`).

| Value | `typeof` |
|---|---|
| `null` | `'object'` (historical bug) |
| function | `'function'` |
| array | `'object'` |

`instanceof` fails across realms. `Object.prototype.toString.call(x)` yields tags like `[object Array]`, `[object Date]`, `[object Null]` — useful for built-ins. Prefer `Array.isArray`, `x === null`, and constructor checks you control.

---

## 8. Event loop, microtasks, and rendering

Rough browser loop:

1. Run JS until the **call stack** is empty.
2. Drain the **microtask** queue (Promises, `queueMicrotask`, `MutationObserver`) **to empty** — including microtasks scheduled by other microtasks.
3. Render opportunity: style/layout/paint; `requestAnimationFrame` callbacks run before paint.
4. Take the next **macrotask** (`setTimeout`, `setInterval`, I/O, UI events, `MessageChannel`, …) and repeat.

Snippet order: **`A`, `E`, `C`, `D`, `B`**.

`C` and `D` are both microtasks; `Promise.then` vs `queueMicrotask` order is FIFO of scheduling — here `C` then `D`. `B` is a timer macrotask.

A tight `then` chain never yields to rendering because the engine does not paint until the microtask queue is empty. Yield with `setTimeout(0)`, `scheduler.yield()`, or chunk work.

---

## 9. Promises: states, chaining, and combinators

States: **pending → fulfilled | rejected**. Settled is final.

Returning a value in `then` fulfills the next promise; throwing or returning a rejected promise rejects it. Omitting `onRejected` skips to the next `catch`. A `catch` that returns a value **recovers** the chain.

| Combinator | Resolve | Reject | `[]` |
|---|---|---|---|
| `all` | array of values, same order | first rejection | `[]` |
| `allSettled` | `{status,value/reason}[]` | never (unless combinator itself throws) | `[]` |
| `race` | first settlement | first settlement | **stays pending** |
| `any` | first fulfillment | `AggregateError` of all rejections | **rejects** (`AggregateError`) |

---

## 10. `async`/`await` vs raw Promises

```js
async function load() {
  try {
    const a = await fetchA();
    const b = await fetchB(a); // B depends on A — sequential is required
    return { a, b };
  } catch (err) {
    return { error: err };
  }
}
```

Independent work should be parallel:

```js
const [a, b] = await Promise.all([fetchA(), fetchB()]);
```

**Pitfall:** `await` in `map` does **not** wait unless you `Promise.all`. `for...of` + `await` is sequential (good for rate limits / order). `for` + `await` is wrong when requests are independent and latency matters. `try/catch` only catches rejections of **awaited** promises; a floating `fetch()` still becomes an unhandled rejection.

---

## 11. Shallow vs deep copy

| Op | Depth | Notes |
|---|---|---|
| `{...obj}`, `Object.assign` | shallow | enumerable **own** props; no prototype; accessors invoke getters |
| `Array.from` / `[...arr]` | shallow | one level of elements |
| `structuredClone` | deep | Dates, Maps, Sets, ArrayBuffers, cyclic graphs; **no** functions, DOM nodes, or prototypes |
| `JSON.parse(JSON.stringify)` | deep-ish | drops `undefined`, functions, symbols; Date → string; no `Map`/`Set`; throws on cycles |

Nested objects still share references after spread — mutating `copy.nested` mutates source. Custom merge / Immer when you need structural sharing, prototype preservation, or class instances.

---

## 12. Property descriptors, freeze, and immutability

- **Data:** `value`, `writable`, `enumerable`, `configurable`.
- **Accessor:** `get`, `set`, `enumerable`, `configurable`.

`preventExtensions`: cannot add keys.  
`seal`: + all props `configurable: false` (cannot delete / reconfigure).  
`freeze`: + data props `writable: false`.

Freeze is **shallow**. Nested objects stay mutable unless frozen recursively (`Object.freeze` walking). In sloppy mode, writes to frozen props fail silently; in strict they throw.

JS “immutability” in Redux is a **convention** (new references), not an engine guarantee, unless you freeze in development.

---

## 13. Iteration: iterables, iterators, generators

- **Iterable:** has `[Symbol.iterator]()` returning an iterator.
- **Iterator:** `{ next() { return { value, done } } }` (optionally `return` / `throw`).

`for...of`, `[...x]`, `Array.from`, and destructuring `[a, b] = x` all call `Symbol.iterator`. Objects are **not** iterable by default (`for...of` throws); `for...in` is unrelated (keys, including inherited enumerable).

**Generators** (`function*`) pause with `yield`, producing lazy sequences and infinite streams without allocating the whole array. `async function*` + `for await...of` consume async iterables (e.g. streamed chunks).

---

## 14. `Map` / `Set` / `WeakMap` / `WeakSet`

Use **`Map`** when keys are not strings/symbols, insertion order matters, you need `.size`, or you must avoid `__proto__` / inherited key collisions. Object keys are stringified (`obj[1] === obj['1']`).

**`WeakMap` keys must be objects** (or non-registered symbols in modern engines) so the GC can collect the entry when the key is unreachable. That enables:

- caches that do not pin DOM nodes / instances
- private fields (pre-`#priv`) without leaking

No iteration / `.size` on WeakMap — enumerating would observe GC. **`Set` / `WeakSet`** are the uniqueness analogues.

---

## 15. Modules: ESM vs CJS

| | ESM | CJS |
|---|---|---|
| Load | static, hoisted, async graph | `require` is runtime, sync |
| Exports | **live bindings** | `module.exports` copied at require time |
| Cycles | bindings exist in TDZ until evaluated | partial `exports` object |
| `this` top-level | `undefined` | `module.exports` (often) |
| Default | `export default` | `module.exports =` — interop is messy (`__esModule`) |

`import 'polyfill'` is a **side-effect import**; bundlers need `package.json` `"sideEffects"` to tree-shake safely. Mixing ESM/CJS (`require` of ESM, default vs `{ default }`) is a frequent interview and production trap.

---

## 16. Events: capturing, bubbling, delegation, and `this`

Phases: **capture** (window → target) → **target** → **bubble** (target → window). `addEventListener(type, fn, { capture: true })` listens on capture.

**Delegation:** listen on a parent; use `event.target.closest(selector)`. Breaks when:

- `stopPropagation` / `stopImmediatePropagation`
- events that do not bubble (`focus` unless `focusin`, `scroll` on some targets, `load`)
- `disabled` form controls that do not fire click
- shadow DOM (retargeting) unless you plan for it

`target` = originating node; `currentTarget` = the node whose listener is running (`this` in a non-arrow listener).

`addEventListener` allows multiple handlers, capture options, `{ once, passive, signal }`, and removal. `onclick` overwrites and is harder to compose.

---

## 17. Memory leaks in frontend JS

Typical roots:

- DOM removed from the tree but still referenced (listeners, React refs, closures)
- `addEventListener` without cleanup
- `setInterval` / open WebSockets / observers
- global / module-level Maps growing forever
- closures capturing a large unused object (the “accidental retain”)

**DevTools:** Memory → heap snapshot, compare snapshots, look for detached HTMLElement, increasing `(array)` / closures. Performance monitor for JS heap.

**Design:** `AbortController` for fetch + listeners (`{ signal }`), WeakMap caches, explicit `removeEventListener`, clear timers in cleanup, bound the size of client stores.

---

## 18. `call` / `apply` / `bind`, and borrowing methods

- `call(thisArg, ...args)` — invoke now.
- `apply(thisArg, argsArray)` — invoke now with array (spread replaced most `apply`).
- `bind(thisArg, ...partial)` — return a **new** exotic bound function; `this` is permanently bound (later `bind`/`call` cannot replace it, except `new boundFn()` which ignores bound `this` and uses the new instance).

`[].slice.call(arguments)` sets `this` to the array-like `arguments` so `slice` copies it to a real array. Rest parameters (`...args`) made this obsolete.

Bound functions do not have a useful `.prototype` for `new` in the old sense; `new bound()` still works by using the **target** function’s prototype.

---

## 19. Prototype methods you must reason about

**Arrays (generic methods — they use `this.length` and indexes):**

- `map` / `filter` / `flatMap`: new array, do not mutate source (callback can still mutate).
- `reduce`: know the no-initialValue + empty array `TypeError`.
- `sort`: **mutates**; comparator must be consistent. Default is UTF-16 string order, so `[10, 2, 1].sort()` → `[1, 10, 2]`. Numeric: `(a, b) => a - b`.
- `splice`: mutates; `slice`: copy a range.
- **Sparse arrays:** holes are not the same as `undefined` slots. `map` / `forEach` skip holes; `for...of` yields `undefined` for them.

**Objects:**

- `'x' in obj` — own or inherited.
- `Object.prototype.hasOwnProperty.call(obj, 'x')` / `Object.hasOwn(obj, 'x')` — own only; `Object.hasOwn` is preferred (objects with null prototype).
- `for...in` enumerates enumerable keys including inherited — usually wrong for data objects; use `Object.keys` / `Object.entries`.

---

## 20. Error handling and control flow at scale

`try/catch` catches **synchronous** throws and **awaited** rejections. A rejection with no `await` / `.catch` is an **unhandled rejection** (`unhandledrejection` event). In Node it can crash; in browsers it is a reliability/Sentry issue.

Fetch wrapper sketch:

- `AbortError` / `error.name === 'AbortError'` → cancelled, often not a toast.
- `fetch` network failure → TypeError, no HTTP status.
- `response.ok === false` → HTTP error; parse body; throw a custom `HttpError` with `status`.
- timeout: `AbortSignal.timeout(ms)` or race abort.

**When to throw:** unexpected, cannot continue. **Result object:** expected failure in a domain API (`{ ok: false, error }`) if callers always branch. **Typed errors:** `class TimeoutError extends Error` so `catch` can switch on `instanceof` / `code`. Never swallow; log with request id; map to user-safe messages at the UI boundary.
