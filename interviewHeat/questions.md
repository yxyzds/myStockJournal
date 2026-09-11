# JavaScript Fundamentals — 20 Interview Questions

Mid-to-senior frontend. Cover these without looking at `answers.md`. Aim for precise language: what happens, why, and what you would do in production.

---

## 1. Closures and lifetime

Explain what a closure is, what it captures, and when those captured values are released. Then describe a real bug that closures commonly cause in UI code (for example in event handlers, timers, or React effects), and how you would prevent it.

## 2. `var` / `let` / `const`, TDZ, and hoisting

Walk through how `var`, `let`, and `const` differ in hoisting, scoping, and the Temporal Dead Zone. Given this snippet, say what is logged and why:

```js
function demo() {
  console.log(a);
  console.log(b);
  var a = 1;
  let b = 2;
}
```

## 3. `this` binding

List the rules that determine `this` in JavaScript (default, implicit, explicit, `new`, arrow functions). Then predict the output of:

```js
const obj = {
  n: 1,
  regular() { return this.n; },
  arrow: () => this?.n,
  nested() {
    const inner = () => this.n;
    return inner();
  },
};
const fn = obj.regular;
console.log(obj.regular(), obj.arrow(), obj.nested(), fn());
```

Assume non-strict browser vs Node if it matters — call that out.

## 4. Prototype chain vs class

How do `class`, `extends`, and `super` map onto prototypes? What is the difference between an own property and an inherited one? How does `instanceof` actually work, and when can it lie?

## 5. `new` and constructors

What does the `new` operator do, step by step? What happens if a constructor returns an object vs a primitive? Why is forgetting `new` dangerous with a classic function constructor, and how do ES6 classes change that?

## 6. Equality and coercion

Explain `==` vs `===`, `Object.is`, and the `ToPrimitive` / `ToNumber` / `ToBoolean` abstract operations at a practical level. Predict:

```js
[] == ![];
[] == false;
[1] == true;
null == undefined;
NaN === NaN;
Object.is(NaN, NaN);
0 === -0;
Object.is(0, -0);
```

## 7. Types, boxing, and primitives

Why can you call `'hi'.toUpperCase()` if strings are primitives? What is autoboxing? What is the difference between `typeof null`, `typeof function`, and `typeof []`? When would you use `Object.prototype.toString.call(x)` instead of `typeof` or `instanceof`?

## 8. Event loop, microtasks, and rendering

Describe the browser event loop: call stack, macrotasks, microtasks, and where painting / `requestAnimationFrame` sit. Predict the order of logs:

```js
console.log('A');
setTimeout(() => console.log('B'), 0);
Promise.resolve().then(() => console.log('C'));
queueMicrotask(() => console.log('D'));
console.log('E');
```

Then explain why a long chain of `Promise.then` can starve rendering.

## 9. Promises: states, chaining, and combinators

What are the three Promise states, and can a settled promise change? Explain error propagation in `.then` / `.catch` chains. Compare `Promise.all`, `allSettled`, `race`, and `any` — including empty-array behavior and what they reject/resolve with.

## 10. `async`/`await` vs raw Promises

Rewrite this with `async`/`await` and discuss error handling, sequential vs parallel execution, and a common pitfall:

```js
function load() {
  return fetchA()
    .then((a) => fetchB(a).then((b) => ({ a, b })))
    .catch((err) => ({ error: err }));
}
```

When is `await` inside a `for` loop wrong, and when is it required?

## 11. Shallow vs deep copy

What is copied by `{...obj}`, `Object.assign`, `Array.from`, and `structuredClone`? Why does spreading fail for nested objects, Dates, Maps, and prototype-bearing objects? When would you choose Immer / a custom merge over `JSON.parse(JSON.stringify(x))`?

## 12. Property descriptors, freeze, and immutability

Explain data vs accessor descriptors, and the difference between `preventExtensions`, `seal`, and `freeze`. Are frozen objects deeply immutable? How do getters, `writable: false`, and `configurable: false` interact? What does this imply for “immutable” Redux/state patterns in JS?

## 13. Iteration: iterables, iterators, generators

What is the iterable protocol vs the iterator protocol? How do `for...of`, spread, and destructuring use `Symbol.iterator`? When would you write a generator instead of building an array? Mention `for await...of` briefly.

## 14. `Map` / `Set` / `WeakMap` / `WeakSet`

When is `Map` better than a plain object as a dictionary? What can be a `Map` key that cannot be an object key? Why do WeakMap keys have to be objects, and what problem does that solve for caches and private data? Why can’t you iterate a WeakMap?

## 15. Modules: ESM vs CJS

Compare ES modules and CommonJS: live bindings vs copied exports, hoisting of `import`, circular dependencies, and default export interop. Why can `this` at the top level of an ES module be `undefined`? What is a side-effect import, and why do bundlers care?

## 16. Events: capturing, bubbling, delegation, and `this`

Explain the three phases of DOM events. How does event delegation work, and when does it break (`stopPropagation`, non-bubbling events, SVG/`disabled`)? Difference between `event.target` and `event.currentTarget`. Why is `addEventListener` preferred over `onclick` in non-trivial apps?

## 17. Memory leaks in frontend JS

List typical leak sources: detached DOM nodes, forgotten listeners, closures holding large objects, timers, global caches, and unbounded arrays in stores. How would you confirm a leak in DevTools? What API choices (`WeakRef`, `AbortController`, `removeEventListener`) help you design leak-resistant code?

## 18. `call` / `apply` / `bind`, and borrowing methods

How do `call`, `apply`, and `bind` differ? What does `Function.prototype.bind` return, and can you re-bind `this` afterwards? Show how `[].slice.call(arguments)` works and why rest/spread largely replaced it. What is a bound function’s `prototype` / `new` behavior?

## 19. Prototype methods you must reason about: arrays and objects

Explain, with mutation vs copy in mind: `map` / `filter` / `reduce` / `flatMap`, `sort` (and its comparator contract), `splice` vs `slice`, and why sparse arrays surprise people. For objects: `in` vs `hasOwnProperty` vs `Object.hasOwn`, and why iterating with `for...in` is usually the wrong tool.

## 20. Error handling and control flow at scale

How do `try/catch` and Promise rejections interact? What is an unhandled rejection, and why is it a production incident class? How would you design a fetch wrapper that distinguishes network errors, HTTP 4xx/5xx, timeouts, and aborts (`AbortError`)? When should you throw, return a Result-like object, or use typed errors?
