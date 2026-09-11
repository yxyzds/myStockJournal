# React — 20 Interview Questions

Mid-to-senior frontend. Cover these without looking at `answers-react.md`. Assume React 18 unless a question names React 19 / RSC. Aim for: what React does, why it matters, and what you would ship.

---

## 1. Render, commit, and “why did this re-render?”

Explain the render phase vs the commit phase. List the reasons a function component re-renders. Then: if parent `App` re-renders, does every child re-render even if its props are referentially equal? When does that *not* happen?

## 2. Keys and reconciliation

What problem do `key`s solve? Why is using the array index as `key` dangerous when the list can reorder, insert, or delete? Predict what goes wrong here if the user types in an input then sorts the list:

```jsx
function Names({ items, onSort }) {
  return (
    <ul>
      {items.map((name, i) => (
        <li key={i}>
          <input defaultValue={name} />
        </li>
      ))}
      <button onClick={onSort}>Sort</button>
    </ul>
  );
}
```

## 3. `useState`: batching, updaters, and stale snapshots

Explain automatic batching in React 18 (including inside promises and timeouts). Why does this log `0` twice, and how do you fix the increment?

```jsx
function Counter() {
  const [n, setN] = useState(0);
  function bumpTwice() {
    setN(n + 1);
    setN(n + 1);
  }
  return <button onClick={bumpTwice}>{n}</button>;
}
```

When must you use the functional updater `setN(n => n + 1)` vs reading state during render?

## 4. Effects: deps, cleanup, and Strict Mode

What is `useEffect` for, and what is it *not* for? Walk through mount → update → unmount, including cleanup. In React 18 Strict Mode (development), why does an effect appear to run twice? Given this, name the bugs:

```jsx
useEffect(() => {
  fetch(`/api/items?q=${query}`)
    .then((r) => r.json())
    .then(setItems);
}, []);
```

## 5. `useEffect` vs `useLayoutEffect` vs `useInsertionEffect`

When would you choose each? What is the visual bug `useLayoutEffect` exists to prevent? Why is `useLayoutEffect` a problem on the server / in SSR hydration, and what do you do instead?

## 6. Rules of Hooks and custom hooks

State the Rules of Hooks and *why* they exist (how React associates hook slots with a component). Why is this illegal, and how would you extract shared logic instead?

```jsx
function Card({ user, showDetails }) {
  if (!user) return null;
  const [open, setOpen] = useState(false);
  if (showDetails) {
    useEffect(() => { loadDetails(user.id); }, [user.id]);
  }
  return <section>{open && <Details />}</section>;
}
```

## 7. Stale closures in hooks

This toggle’s interval always logs the initial `count`. Why, and give two correct fixes (one with refs, one without)?

```jsx
function Ticker() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      console.log(count);
      setCount(count + 1);
    }, 1000);
    return () => clearInterval(id);
  }, []);
  return <p>{count}</p>;
}
```

## 8. Context: API, rerenders, and splitting

How do `createContext`, `Provider`, and `useContext` work? Why does a context value object created inline (`value={{ user, flags }}`) make the whole tree rerender? How do you keep a `ThemeToggle` from rerendering when `user` changes? Mention React 19 `use` if relevant.

## 9. `memo`, `useMemo`, `useCallback` — when they help

What does `React.memo` compare? When is `useCallback` required for `memo` to work? When is `useMemo` *not* a performance win? Critique this:

```jsx
const value = useMemo(() => ({ id: user.id }), [user.id]);
const onClick = useCallback(() => select(user.id), [user.id]);
return <Row value={value} onClick={onClick} />;
```

Assume `Row` is not memoized.

## 10. Refs: `useRef`, DOM, and `forwardRef`

Contrast `useRef` with `useState`. When do you store a value in a ref rather than state? How do you expose a child DOM node to a parent historically (`forwardRef`) vs React 19? When is `useImperativeHandle` justified, and what does it cost in design quality?

## 11. Controlled vs uncontrolled inputs

Define both. When is uncontrolled (`defaultValue` + ref) better? What is a “switching from uncontrolled to controlled” warning, and how does this cause it?

```jsx
function Search({ initial }) {
  const [q, setQ] = useState(initial);
  return <input value={q} onChange={(e) => setQ(e.target.value)} />;
}
```

Also: how do you reset a form when `userId` changes?

## 12. Derived state and “syncing props into state”

Why is this usually a bug, and what are the three preferred alternatives (fully controlled, derive during render, reset with `key`)?

```jsx
function Profile({ user }) {
  const [name, setName] = useState(user.name);
  useEffect(() => { setName(user.name); }, [user.name]);
  return <input value={name} onChange={(e) => setName(e.target.value)} />;
}
```

When *is* copying a prop into state legitimate?

## 13. Lists, identity, and element types

React’s first check when reconciling two nodes is the **element type** (`div` vs `span`, `UserCard` vs `AdminCard`). What happens if you swap component type but keep the same `key`? Why is this a problem?

```jsx
function Screen({ isAdmin }) {
  const Cmp = isAdmin ? AdminForm : UserForm;
  return <Cmp />;
}
```

Vs `{isAdmin ? <AdminForm /> : <UserForm />}`. Are they the same? When would you force a remount with `key={user.id}` on a form?

## 14. Concurrent React: `startTransition`, `useDeferredValue`, Suspense

What problem do transitions solve compared to urgent `setState`? How does `useDeferredValue` differ from `startTransition`? How does Suspense for data (or lazy components) interact with the UI: fallback, stale UI, and error boundaries? When would you *not* wrap a state update in `startTransition`?

## 15. Data fetching: races, abort, and where fetching lives

This search has a race. Explain it and fix it with `AbortController` *and* with a sequence number. Then argue when fetching belongs in `useEffect`, in an event handler, in a router loader, in React Query / SWR, or on the server (RSC).

```jsx
useEffect(() => {
  let ignore = false;
  fetch(`/api?q=${q}`)
    .then((r) => r.json())
    .then((data) => { if (!ignore) setData(data); });
  return () => { ignore = true; };
}, [q]);
```

Is the `ignore` flag enough? What does it *not* cancel?

## 16. Error boundaries and failure UI

What can an error boundary catch, and what can it **not** catch (event handlers, async, SSR)? Sketch the class API (`getDerivedStateFromError` / `componentDidCatch`) and mention the usual function-component gap. How do you show a per-widget failure without crashing the whole app? How do you recover (retry, reset `key`)?

## 17. Composition patterns

Compare: prop drilling, Context, slot/`children`, render props, and compound components (`Select` + `Select.Option`). When is lifting state up the right call vs colocating it? What is “inversion of control” via `children` in a `Modal`/`Layout`? Critique putting business data in Context just to avoid three levels of props.

## 18. Performance: what to measure before memoizing

A table of 5,000 rows feels janky. Rank what you would check: extra renders, expensive render, layout thrash, uncontrolled inputs, missing `key`, Context at the root, creating new arrays in render, CSS, virtualization. When is `useVirtualizer` / windowing the real answer rather than `React.memo` on each row? What does React DevTools Profiler actually tell you?

## 19. React 19 / RSC (senior-flavored)

At a high level: what is a Server Component vs a Client Component? What cannot run in an RSC (hooks, browser APIs, event handlers)? How does `'use client'` change the bundle? What is a Server Action, and what are the serialization / security constraints? How does `use()` for promises/context differ from `useEffect` fetching?

## 20. Accessibility and UI correctness in React

Name React-specific a11y traps: missing `htmlFor`, clickable `div`s, `autoFocus` vs SPA routing, focus loss on rerender, `key` remounting and focus, `useId` for SSR-safe ids, live regions for async status. How do you manage focus when opening/closing a modal (and why a portal matters)? Why is `eslint-plugin-jsx-a11y` not sufficient by itself?
