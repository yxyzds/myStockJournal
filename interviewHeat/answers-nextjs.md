# Next.js — Answers

Numbered to match `questions-nextjs.md`. Use these after attempting the questions.

---

## 1. App Router vs Pages Router

| | Pages (`pages/`) | App (`app/`) |
|---|---|---|
| Routing | file = route; `_app`, `_document` | nested folders; `layout`/`page` |
| Data | `getServerSideProps` / `getStaticProps` / `getInitialProps` | `async` Server Components, `fetch`, `generateStaticParams` |
| Layouts | rebuild on each page via `_app` | **nested layouts persist** across child navigations |
| Bundle | pages are client-hydrated (unless special) | RSC by default; `'use client'` opt-in |

Still choose Pages for a frozen codebase, certain plugin ecosystems, or very specific `getInitialProps` behaviors. Coexistence is supported: both folders, **same URL must not conflict**.

Traps: `useRouter` from `next/router` vs `next/navigation`; no `_document` (use root layout `<html>`/`<body>`); `_app` providers must move to a Client `Providers` wrapped in the root layout; `next/head` vs Metadata API.

---

## 2. Server Components vs Client Components in Next.js

**Default in `app/` is Server Components.** They can be `async`, use secrets, talk to DB, and keep heavy deps off the client.

Cannot use: `useState`/`useEffect` and most hooks, browser APIs, event handlers (`onClick`).

`'use client'` is a **module directive**. That file **and anything it imports** become part of the client graph (until they hit a server-only import, which is illegal). A leaf `'use client'` button is cheap; putting it on `components/index.ts` that re-exports a chart library ships the chart to every importer.

**Composition:** keep the shell as a Server Component and pass **children** (server-rendered HTML/RSC payload) into a small client wrapper:

```tsx
// Modal.tsx
'use client';
export function Modal({ children }: { children: React.ReactNode }) { /* overlay */ }

// page.tsx (server)
<Modal><ExpensiveServerTable /></Modal>
```

The table does not become a client component.

---

## 3. File-system routing conventions

- `page.tsx` — the route UI (makes the URL public).
- `layout.tsx` — wraps pages; **state preserved** on child navigations; must include `{children}`.
- `template.tsx` — like layout but **remounts** on navigation (reset state).
- `loading.tsx` — instant loading UI (Suspense boundary).
- `error.tsx` — error boundary for the segment.
- `not-found.tsx` — `notFound()`.
- `route.ts` — HTTP handler, no UI.
- `default.tsx` — fallback for parallel route slots.

**Route groups** `(marketing)` — folders for organization / different layouts; **not** in the URL.  
`[id]` — required param.  
`[...slug]` — catch-all.  
`[[...slug]]` — optional catch-all (also matches `/`).

---

## 4. Parallel routes and intercepting routes

`@modal` / `@analytics` are **named slots** beside `children`. The layout receives them as props: `{ children, modal }`. Lets two pages render at once (dashboard + drawer).

`default.tsx` fills a slot when Next doesn’t know what to show on full load (soft nav into a slot then hard refresh).

**Intercepting:** `(.)photo/[id]` intercepts `/photo/1` **from the same level** and can render a modal **on top of** the current page. `(..)` one level up, `(...)` from root.

- **Client navigation** from a gallery: modal overlay, URL changes.
- **Hard refresh** on `/photo/1`: intercept may **not** apply; you need a real `app/photo/[id]/page.tsx` so the resource is shareable.

---

## 5. Rendering models: SSG, SSR, ISR, and dynamic

App Router:

- **Static:** route prerendered at build (or on first request with ISR). HTML/RSC payload reused.
- **Dynamic SSR:** render per request.
- **ISR:** static + `revalidate` seconds or on-demand `revalidatePath`/`Tag`.

`generateStaticParams` prerenders listed `[id]`s; others 404 or render on demand depending on `dynamicParams`.

**Dynamic APIs** that typically opt a route into dynamic rendering: `cookies()`, `headers()`, `draftMode()`, `searchParams` (page props — version-dependent; Next 15 made some fetching uncached by default). Uncached `fetch` (`no-store`) also marks dynamic.

Opt-in:

```ts
export const dynamic = 'force-static'; // or 'force-dynamic'
export const revalidate = 60;
```

Prefer caching by default and **explicitly** `no-store` for user-specific data.

---

## 6. The Next.js caching layers

1. **Request memoization:** same `fetch` URL+options in one server request is deduped (React `cache()` too).
2. **Data Cache:** persistent `fetch` cache across requests (CDN/server). `revalidate` / tags.
3. **Full Route Cache:** cached **full** RSC/HTML of a static route.
4. **Router Cache:** **client-side** cache of visited/prefetched RSC payloads (in-memory). This is what makes back/forward instant — and **stale after mutations**.

`cache: 'force-cache'` — look in Data Cache (Next 15: default for `fetch` changed toward no-store; **state the version in interviews**).  
`next: { revalidate: 60 }` — ISR for that fetch.  
`cache: 'no-store'` — never Data Cache.

`revalidatePath('/blog')` — bust that route (and optionally layout).  
`revalidateTag('posts')` — bust all fetches tagged `{ tags: ['posts'] }` — finer-grained.

**Bug:** Server Action updates DB; UI still shows old list because **Router Cache** served a cached RSC tree. Fix: `revalidatePath`/`Tag` in the action, `router.refresh()`, or `cache: 'no-store'` for that data.

---

## 7. Data fetching patterns and waterfalls

Server Components `await fetch` during render. No `useEffect` waterfall to the browser for the first paint.

Next/React **dedupe** identical `fetch` in the same render pass (layout + page both load user → one network).

**Waterfall:** `const user = await getUser(); const posts = await getPosts(user.id)` is **necessary** if posts depend on user. If independent: `Promise.all([getUser(), getFlags()])` or start both promises first then await.

Pass promises to children and `use(promise)` to stream. Don’t `await` a slow widget in the **root layout** — you block every page.

Client + React Query: live refetch on focus, optimistic updates, infinite scroll, browser-only APIs, data shared across client islands. Don’t duplicate a server-fetched tree into RQ unless you need client cache.

---

## 8. Streaming, `loading.tsx`, and Suspense

`loading.tsx` is a **Suspense boundary** around the `page` (and sometimes the segment). On navigation, Next can show it immediately.

SSR streaming: shell (layouts) can flush first; Suspense fallbacks flush; then slow chunks. User sees HTML sooner; TTFB vs TTI still matter.

Whole-page `loading.tsx` = one big skeleton (layout might already be visible). Wrap **slow panels** in `<Suspense fallback={...}>` so the header/nav isn’t replaced by a spinner.

Prefetch + Router Cache can skip the loading flash. For always-fresh user data, a too-aggressive `loading.tsx` still flashes. Use `template` only if you **want** remount. `useTransition` for tab switches inside a page.

---

## 9. Errors: `error.tsx`, `global-error.tsx`, `not-found.tsx`

`error.tsx` wraps the **segment and below** (not the parent layout of that same folder — layout errors bubble **up**). It must be a **Client Component** (`componentDidCatch` semantics + `reset()`).

- `notFound()` → nearest `not-found.tsx` (or root). HTTP 404.
- `redirect()` → 307/308; throws internally; don’t `try/catch` it blindly.
- Other throws → `error.tsx`.

`global-error.tsx` replaces the **root layout** (must include `<html>`/`<body>`) — last resort.

Recovery: `reset()` from `error.tsx` re-renders the tree; for actions, show `useActionState` error and let the user retry. Log in `error.tsx` with a digest, not raw internals, to the user.

---

## 10. Route Handlers vs Pages API routes

`app/api/hello/route.ts`:

```ts
export async function GET(req: Request) {
  return Response.json({ ok: true });
}
```

Web `Request`/`Response`. `cookies()` / `headers()` from `next/headers`. Pages `pages/api` uses Node `req`/`res` (still valid).

| Need | Tool |
|---|---|
| Form mutation, revalidate, close to UI | Server Action |
| Public JSON, webhooks, OAuth callback | Route Handler |
| First-party cookie session JSON for a SPA island | Route Handler |
| Streaming LLM tokens | Route Handler / `ReadableStream` |

CORS matters for **cross-origin** clients; same-origin App Router fetches don’t. `runtime = 'edge'` for geography; Node for native SDKs.

---

## 11. Server Actions

```ts
'use server';
export async function updateName(formData: FormData) { /* ... */ }
```

Bind to `<form action={updateName}>` (progressive enhancement) or call from a Client Component (POST under the hood).

**Serializable:** JSON-like, `FormData`, `Date`, `Map`/`Set` with limits — **not** functions, class instances, DOM nodes.

Treat as a **public POST**: authenticate session, authorize the resource, validate input. Don’t trust hidden `userId`. Next adds origin checks; still do server-side authz.

`useFormStatus` — pending on the **parent form**.  
`useActionState` — last result + pending.  
On success: `revalidatePath` / `revalidateTag` so RSC trees refresh.

Thrown errors: error boundary or `useActionState` error; don’t leak SQL/stack to the client.

---

## 12. Middleware: `middleware.ts`

Runs on the **Edge** (by default) **before** the route. Matcher selects paths.

Good: redirects (locale, auth to `/login`), rewrites (A/B, multi-tenant host → folder), adding request headers, geo.

Bad: large `node_modules`, ORM, long JWT libraries that bloat the edge bundle, assuming Node APIs.

```ts
export function middleware(request: NextRequest) {
  const res = NextResponse.next();
  res.cookies.set('seen', '1');
  return res;
}
export const config = { matcher: ['/dashboard/:path*'] };
```

`redirect` — change URL. `rewrite` — keep URL, serve another path. `next()` — continue.

Set cookies on the **response**. Reading cookies from the request is the incoming set. Matcher mistakes (`/:path*` vs excluding `_next/static`) can break assets or loop redirects.

---

## 13. `next/image` and fonts

`Image` generates `srcset`, lazy-loads below the fold, prevents CLS with **known aspect ratio**, can optimize through `/_next/image` (or unoptimized).

**`sizes`** tells the browser which srcset candidate matches **layout width** (`(max-width: 768px) 100vw, 50vw`). Wrong `sizes` → too small (blurry LCP) or too large (bytes).

Static import: dimensions inferred. Remote: allowlist `images.remotePatterns`. `fill` + relative parent + `object-fit: cover` for hero crops.

LCP image: `priority` (or `fetchPriority="high"`), correct `sizes`, don’t lazy-load the hero.

`next/font`: hosts font files, injects fallback metrics (`adjustFontFallback`) to cut CLS, no extra CDN round trip.

---

## 14. Metadata, Open Graph, and the Metadata API

`export const metadata = { title: '…' }` — static.  
`generateMetadata({ params })` — async, per-request/per-entity.

Nested layouts **merge**. `title: { default, template: '%s | Acme' }` so pages only set the inner title.

`generateViewport` for theme-color / viewport. `sitemap.ts` / `robots.ts` are special route handlers.

OG: `openGraph.images` or `opengraph-image.tsx`. Don’t generate OG for **draft** posts without auth — metadata runs on the server but the **image URL** is public.

Cannot use `next/head` the old way in App Router; that’s Pages.

---

## 15. Environment variables, secrets, and `server-only`

Only `NEXT_PUBLIC_*` are exposed to the **browser** (inlined at build). Everything else is server-only **if** you never import it from a Client Component.

Leaks: `'use client'` file importing `lib/db.ts` that reads `DATABASE_URL`; the bundler will error or, worse, you stringify config into a client module. `console.log(process.env)` in a client file.

`import 'server-only'` — any client import of that module **fails the build**.

Read `DATABASE_URL` in Server Components, Actions, Route Handlers, not in client hooks. Vercel: project env per Preview/Production. Docker: runtime env; **don’t** bake secrets into `NEXT_PUBLIC_`. Remember: changing env often requires **rebuild** for inlined public vars.

---

## 16. `next.config`: redirects, rewrites, headers, and images

- **redirects:** SEO/canonical URL change (308).
- **rewrites:** proxy / hide implementation (`/blog` → CMS) without changing the address bar.
- **middleware:** per-request logic (auth, geo) that doesn’t belong in a static config list.

`headers()`: CSP, `X-Frame-Options`, HSTS. Missing CSP + `dangerouslySetInnerHTML` is a common interview security note.

`output: 'export'` — **static HTML only**: no ISR, no SSR, no Route Handlers, no middleware (limitations). `standalone` — Docker: copy `.next/standalone` + static.

`transpilePackages: ['@acme/ui']` for monorepo packages that ship TS or modern syntax.

---

## 17. Auth, cookies, and session in the App Router

`cookies()` in Server Components / Actions / Route Handlers — **dynamic**, opts out of static rendering.

Middleware: `request.cookies`; can redirect unauthenticated users **before** RSC work.

Pattern:

1. httpOnly, `Secure`, `SameSite=Lax` session cookie.
2. Server validates (JWT verify or session store).
3. Pass `{ id, name, role }` as props to a small client island — **not** the secret.
4. Server Action: `const session = await getSession(); if (!session) throw` / `redirect`.

Don’t fetch `/api/me` from the client with the cookie sent to a **third-party** origin. CSRF: same-site cookies + Next action origin checks; still validate intent on destructive actions.

---

## 18. Edge vs Node runtimes

| | Node (default) | Edge |
|---|---|---|
| APIs | full Node | Web standards subset |
| Good for | DB, heavy SDKs, auth libraries | Middleware, light JWT, geo |
| Pain | farther from user if single region | no arbitrary native addons; CPU limits |

`runtime = 'edge'` on a Route Handler / page. If your ORM or `bcrypt` native bindings fail, stay on Node.

Latency win is real for **middleware** (runs close to the user). For a page that hits a regional Postgres, Edge in IAD + DB in `syd` can be **worse**. Match runtime to data locality.

Self-host: Edge may mean a different runner; don’t assume Vercel APIs (`waitUntil` etc.) everywhere.

---

## 19. Client navigation, prefetch, and the Router Cache

`<Link>` prefetches static routes in viewport (production). Disable with `prefetch={false}` for rare/expensive/auth-only pages.

`useRouter`, `usePathname` → Client Components. `useSearchParams()` can **bail out of static rendering** unless wrapped in `<Suspense>` (shows a fallback on first paint).

Update URL: `router.push` / `replace`, or `<Link>`. `scroll={false}` for tabs. `shallow` was Pages Router; in App Router you combine `searchParams` + server render (or client-only state if the server mustn’t rerun).

Stale UI after Action: Router Cache (Q6). Call `revalidatePath`/`Tag` in the action and/or `router.refresh()`. Optimistic UI with `useOptimistic` then refresh.

---

## 20. Performance and architecture at scale

Typical ranking for a slow dashboard:

1. `'use client'` too high → huge JS, slow hydration.
2. Barrel files importing the world (charts, editors).
3. Root layout `await getUser()` blocking **every** nav — wrap user widget in Suspense instead.
4. Sequential `await` waterfalls (Q7).
5. Uncached user `fetch` + no streaming.
6. Images without `sizes`/`priority`.
7. RSC payload bloated with unused fields (select in DB, don’t send whole rows).
8. Then micro-memoization.

**PPR (Partial Prerendering):** prerender a static **shell**, stream dynamic holes (cookies/user) — marketing chrome instant, personalized bits later.

Split: route groups `(marketing)` vs `(app)` with **two root layouts** (different `<html>` chrome). Separate apps (Turborepo) when auth, release cadence, or edge vs node diverge too much. Don’t force one mega-`layout` that awaits billing for the pricing page.
