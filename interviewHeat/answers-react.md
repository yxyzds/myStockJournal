# React — Answers

Numbered to match `questions-react.md`. Use these after attempting the questions.

---

## 1. Render, commit, and “why did this re-render?”

**Render:** React calls your function (and nested components it decides to visit), computes the next UI (VDOM / fiber). May be **interrupted** or thrown away in concurrent mode. Must be pure: no DOM writes, no subscriptions.

**Commit:** React applies the computed tree to the DOM (and refs, layout effects). This is synchronous and cannot be interrupted mid-tree in the same way.

A function component re-renders when:

- its state changes (`setState` / reducer)
- its parent re-renders and React visits this child
- its context value changes
- it is forced (`key` change remounts; `flushSync` is still a state update)

**Default:** if `App` re-renders, `App`’s children **re-render too**, even if props are shallow-equal. Props equality is **not** checked unless the child is wrapped in `React.memo` (or is a built-in that bails out), or you return the **same element reference** (`const child = <Expensive />` stored / passed as `children` so React skips reconciling that subtree as a new type+props pair from this parent).

Bail-outs: `memo` + equal props; context consumers only when that context’s value identity/change is detected; `children` passed from a parent that did *not* recreate them.

---

## 2. Keys and reconciliation

Keys let React match list children across renders: **same type + same key** → update in place; different key → unmount / remount.

**Index keys** are stable only if the list is append-only and never reorders. Insert/delete/sort shifts indexes → React reuses the wrong component instance (state, uncontrolled inputs, focus, effects).

In the snippet, `defaultValue` makes inputs **uncontrolled**. After sort, keys `0,1,2…` still point at the same positions, so the **DOM inputs keep their typed text** while the `name` data underneath shuffled — or the opposite confusion. Use a stable id: `key={user.id}`.

Keys must be unique among **siblings**, not globally. Do not use random keys each render (remount every time).

---

## 3. `useState`: batching, updaters, and stale snapshots

React 18 **batches all** `setState` in the same event, timeout, promise, and native handler by default (unless `flushSync`). Multiple updates → one re-render.

`bumpTwice` reads `n` from the **render snapshot** (e.g. `0`). Both `setN(0 + 1)` request the same next state `1`. Result: **`n` becomes 1**, not 2.

Fix: `setN(n => n + 1)` twice — updaters queue and compose.

Use the functional updater when the next value **depends on the previous** and you cannot trust a closure (batched updates, effects, async). Reading `n` during render is correct for **this** render’s UI. For “latest in a timeout,” use a ref or the updater.

---

## 4. Effects: deps, cleanup, and Strict Mode

`useEffect` synchronizes with **external systems** (network, DOM, subscriptions, timers). It is **not** for transforming data for render (do that in render) and not for responding to a click (do that in the event handler).

Lifecycle: after commit (paint): run effect. Before next effect or unmount: run **cleanup** from the previous effect, then the new effect.

**Strict Mode (dev):** React mounts, runs effects, **immediately remounts** (cleanup + effect again) to surface missing cleanup. Production runs once on mount.

Bugs in the snippet:

- `[]` deps: `query` is stale; search never updates.
- No cleanup / abort: a slow response can overwrite a newer query (**race**).
- No loading / error handling.
- Missing cancellation on unmount (setState on unmounted is ignored in 18 but the request still wastes work and can theoretically apply if you navigate back into a living instance).

Fix: `[query]`, `AbortController` in cleanup, handle HTTP errors.

---

## 5. `useEffect` vs `useLayoutEffect` vs `useInsertionEffect`

| Hook | Timing | Use |
|---|---|---|
| `useEffect` | after paint | subscriptions, fetch, logging |
| `useLayoutEffect` | after DOM update, **before** paint | measure DOM, restore scroll, hide flicker |
| `useInsertionEffect` | before DOM mutations | CSS-in-JS style injection |

`useLayoutEffect` exists so the user never sees a **wrong first frame** (tooltip position 0,0 then jump).

On the server there is no layout. `useLayoutEffect` warns during SSR. Pattern: `useEffect` for non-critical measure, or a client-only component (`useState` + `useEffect` to set `mounted`), or `useId` instead of layout for ids. Do not block TTI with layout effects that do heavy work.

---

## 6. Rules of Hooks and custom hooks

Rules: only call hooks at the **top level** of a React function (component or custom hook); only call them from React functions, not plain JS. Same order every render so the dispatcher can map call #N to the Nth hook slot on the fiber.

The snippet is illegal: `useState` after an early `return`, `useEffect` inside `if`. When `user` or `showDetails` flips, the hook count changes → React throws.

Extract:

```jsx
function useDetails(user, enabled) {
  useEffect(() => {
    if (!enabled || !user) return;
    loadDetails(user.id);
  }, [user, enabled]);
}

function Card({ user, showDetails }) {
  const [open, setOpen] = useState(false);
  useDetails(user, Boolean(user) && showDetails);
  if (!user) return null;
  return <section>{open && <Details />}</section>;
}
```

Conditional **logic inside** a hook is fine; conditional **calls** of hooks are not.

---

## 7. Stale closures in hooks

The effect ran once (`[]`). The interval closure captured `count === 0` forever. `setCount(0 + 1)` always schedules `1`. Logs stay `0`.

**Fix A — updater, empty deps still logging stale:**

```jsx
setCount((c) => c + 1); // count in UI is fine
```

Logging still stale unless you also log inside the updater (side effects in updaters are discouraged) or use a ref.

**Fix B — ref for latest:**

```jsx
const countRef = useRef(count);
countRef.current = count;
useEffect(() => {
  const id = setInterval(() => {
    console.log(countRef.current);
    setCount((c) => c + 1);
  }, 1000);
  return () => clearInterval(id);
}, []);
```

**Fix C — resubscribe:** deps `[count]` and clear/reset the interval every tick (works, slightly wasteful).

Prefer B for a stable interval; C when the subscription identity should track a value (WebSocket URL).

---

## 8. Context: API, rerenders, and splitting

`createContext(default)` → `Provider` sets the current value for descendants → `useContext` subscribes. Any consumer re-renders when the **provider value** changes (`Object.is`).

`value={{ user, flags }}` is a **new object every render** of the provider → all consumers re-render even if `user`/`flags` did not change.

To isolate `ThemeToggle`:

- Split contexts: `UserContext` and `ThemeContext` (and optionally `FlagsContext`).
- Memoize value: `useMemo(() => ({ user, flags }), [user, flags])` — still rerenders everyone if `user` changes.
- Split **providers** and put `ThemeToggle` under only theme.
- In React 19, `use(Context)` can be called conditionally; it still subscribes. `useMemo` on the provider value remains the first lever.

Also: a memoized child **still** rerenders if it `useContext`s a changing context. `memo` does not skip context updates.

---

## 9. `memo`, `useMemo`, `useCallback` — when they help

`React.memo(Row)` shallow-compares **props**. Functions and objects from the parent fail the check unless stabilized.

`useCallback` / `useMemo` help **only if a child actually bails out** (`memo`, or `deps` of a child effect, or a context value you memoized).

If `Row` is **not** memoized, both hooks in the snippet do **nothing** for `Row`’s render cost. You still pay hook overhead. `useMemo` is worth it when the **computation** is expensive (filter 10k rows), not for wrapping `{ id }` by reflex.

Critique: stabilize callbacks only at the boundary that is memoized; measure first; don’t memoize every literal.

---

## 10. Refs: `useRef`, DOM, and `forwardRef`

`useRef(init)` returns `{ current }` that persists across renders. **Mutating `current` does not trigger render.** `useState` does.

Use a ref for: DOM nodes, timer ids, previous props, “latest callback” to avoid resubscribing, anything you read in an effect/event without displaying it.

**React 18:** `forwardRef((props, ref) => <input ref={ref} />)` to pass a ref through a function component.  
**React 19:** `ref` is a normal prop; `forwardRef` is optional.

`useImperativeHandle(ref, () => ({ focus, reset }))` exposes a **narrow imperative API** instead of the raw DOM. Justified for design-system inputs (focus + select). Cost: hidden control flow, harder to type and test; prefer props/`onClose` for declarative behavior.

---

## 11. Controlled vs uncontrolled inputs

**Controlled:** `value` + `onChange` — React is the source of truth.  
**Uncontrolled:** `defaultValue` / no `value`; DOM holds the text; read via ref on submit.

Uncontrolled is better for large untouched forms, file inputs, and when you don’t need per-keystroke React state.

**Warning:** `value` goes from `undefined` → string (or the reverse). `useState(initial)` with `initial` sometimes `undefined` then later a string will trip it.

The `Search` snippet is controlled **if `initial` is always a string**. If `initial` is `undefined` on first paint, `value={undefined}` → uncontrolled, then a string → warning. Use `value={q ?? ''}` and `useState(initial ?? '')`.

**Reset:** `key={userId}` on the form (remount) or set state in an event / `useEffect` only when you truly need to sync (prefer `key`).

---

## 12. Derived state and “syncing props into state”

The `useEffect` copies `user.name` → `name` **after** paint: extra render, can overwrite in-progress edits, and is easy to miss other fields.

Prefer:

1. **Fully controlled:** `value={name} onChange={onNameChange}` — parent owns it.
2. **Derive in render:** `const display = user.name.toUpperCase()` — no state.
3. **Reset with `key`:** `<Profile key={user.id} user={user} />` — local draft state starts fresh.

Copying a prop into state is legitimate for a **draft** that starts as the prop and then diverges (rename dialog). Initialize once: `useState(user.name)` and reset with `key={user.id}`, not an effect.

---

## 13. Lists, identity, and element types

If the **type** changes (`AdminForm` → `UserForm`), React **unmounts** the old tree and **mounts** a new one — state is lost. Same if you switch `div` ↔ `span`.

`const Cmp = isAdmin ? AdminForm : UserForm; return <Cmp />` is the same reconciliation as a ternary of two elements: **different function identity** → remount when `isAdmin` flips. That is often what you want (don’t leak admin field state into the user form).

Force remount with `key={user.id}` when the **same** component type should drop local state (wizard, form draft, video player).

Do not do `items.map(() => { const Inner = () => ...; return <Inner /> })` — new type every row every render → remount + terrible performance.

---

## 14. Concurrent React: `startTransition`, `useDeferredValue`, Suspense

Urgent updates (typing, click, checked) should feel instant. **Transitions** mark updates as non-urgent: React can keep showing the previous UI, interrupt the heavy render, and avoid tearing the input.

```jsx
startTransition(() => setQuery(slowFilterValue));
```

`useDeferredValue(value)` is for when you **cannot** wrap the setter (you receive `value` from a parent / library). You keep showing a deferred copy for expensive children.

**Suspense:** a child throws a promise / uses a lazy import → nearest `<Suspense fallback>` shows fallback (or, with transitions, may keep stale UI). Errors go to **error boundaries**, not Suspense.

Do **not** wrap the character the user just typed in a transition — the input will lag. Wrap the **filtered list**, not the controlled input’s `value`.

---

## 15. Data fetching: races, abort, and where fetching lives

Slow request A then fast request B: if A finishes last, UI shows stale A. The `ignore` flag **drops late setState** but **does not abort** the network; the server still works; bandwidth wasted; side effects in `then` before `setData` still run.

**AbortController:**

```jsx
useEffect(() => {
  const ac = new AbortController();
  fetch(url, { signal: ac.signal })
    .then((r) => r.json())
    .then(setData)
    .catch((e) => { if (e.name !== 'AbortError') setError(e); });
  return () => ac.abort();
}, [q]);
```

**Sequence:** increment `reqId`; only `setData` if `reqId === latest`.

Where fetching lives:

| Place | When |
|---|---|
| Event handler | user-initiated (submit, click) — preferred over effect-for-click |
| `useEffect` | syncing to an external store / URL that isn’t covered by a library |
| Router loader | URL is the source of truth (SSR/SPA) |
| React Query / SWR | cache, retry, dedupe, focus refetch |
| RSC | initial page data without a client waterfall |

---

## 16. Error boundaries and failure UI

Catch: render-time throws in the **tree below**, constructors, lifecycle.  

**Not:** event handlers, `setTimeout`, `async` `then`, the boundary’s own render, SSR in some setups (need a server-aware boundary).

Class:

```jsx
class EB extends React.Component {
  state = { err: null };
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(err, info) { log(err, info.componentStack); }
  render() {
    if (this.state.err) return this.props.fallback;
    return this.props.children;
  }
}
```

Function components still need a class (or `react-error-boundary`) as the boundary.

Wrap **widgets** (chart, payment iframe) not the whole `App`, so one failure degrades. Recover: “Try again” that `setState({ err: null })`, or `key={retryCount}` to remount children.

Also wrap lazy routes: `<Suspense>` + error boundary together.

---

## 17. Composition patterns

| Pattern | Strength |
|---|---|
| Lift state | siblings must share |
| Colocate | default — closest to the UI that uses it |
| Prop drilling 2–3 levels | fine, explicit |
| Context | many distant consumers, theme/auth/i18n |
| `children` / slots | layout without knowing content |
| Render props / `renderX` | parent injects behavior (less trendy, still valid) |
| Compound components | implicit shared state via context (`<Tabs><Tabs.Panel>`) |

**Inversion of control:** `<Modal>{children}</Modal>` lets the caller compose body/footer; the modal owns overlay, focus trap, `role="dialog"`.

Context for “avoid three props” couples the tree, makes values implicit, and rerenders broadly. Prefer passing props or a dedicated `UserAvatar` that receives `user`. Use Context when **many** unrelated depths need the same value.

---

## 18. Performance: what to measure before memoizing

Order of investigation:

1. **Profiler:** is time in React commit or in the browser (paint/layout)?
2. Unnecessary **whole-app** rerenders (root context, router, a timer in `App`).
3. **New array/object** props into a heavy list.
4. **Index keys** / remounting inputs.
5. Layout thrash (`useLayoutEffect` + measure in a loop).
6. CSS / images / main-thread JS outside React.
7. **Virtualize** 5k DOM rows (`@tanstack/react-virtual`). `memo` on 5k still **creates 5k fibers** and DOM nodes — windowing is the real fix.
8. Then `memo` on row + stable callbacks.

Profiler: which components committed, why they rendered (props/state/hooks), how long render vs commit. “Wasted” renders that are cheap do not matter. Optimize **measured** slow commits.

---

## 19. React 19 / RSC (senior-flavored)

**Server Components** run on the server (or at build time). They can `async` fetch, use secrets, keep large deps off the client bundle. They **cannot** use state/effects, or attach `onClick`. Output is a serialized RSC payload, not “HTML plus hydration of that component.”

**`'use client'`** marks a **module boundary**: that file and its imports become a client bundle and hydrate. Importing a client component into a server component creates a hole in the server tree.

**Server Actions:** functions that run on the server, callable from forms / client. Arguments must be **serializable**. Treat them as public HTTP: authenticate, authorize, validate; never trust hidden fields.

**`use(promise)` / `use(context)`:** unwrap a promise during render (works with Suspense). Data is part of the render model, not an effect after paint — no waterfalls of `useEffect` → setState → child fetch. Client `useEffect` fetching still exists for browser-only resources and subscriptions.

---

## 20. Accessibility and UI correctness in React

Traps:

- `<label>` without `htmlFor` / wrapping the control
- `div onClick` without `button` semantics, keyboard, `role`
- SPA route change: focus stays at the bottom; move focus to `h1` or skip link
- Remount `key` steals focus / resets inputs
- Hydration: `useId()` for checkbox/label pairs instead of `Math.random()`
- Announce fetch status with `aria-live` / `role="status"`
- `autoFocus` fights screen readers and routing

**Modal:** render in a **portal** (`document.body`) so `z-index` and overflow work; trap Tab; restore focus to the opener on close; `Escape` closes; `aria-modal` + labelled by title id.

`jsx-a11y` catches static issues (alt, `aria-*` typos). It cannot catch **focus management**, route announcements, color contrast of runtime CSS, or disabled-button-only workflows. Test with keyboard and one screen reader pass on critical flows.
