# Next.js — 20 Interview Questions

Mid-to-senior frontend. Cover these without looking at `answers-nextjs.md`. Default to **App Router** (Next.js 14/15) unless a question names Pages Router. Aim for: what runs where, what is cached, and what you would ship.

---

## 1. App Router vs Pages Router

What changed between `pages/` and `app/` in routing, data fetching, layouts, and bundling? When would you still choose Pages Router? How do the two coexist in one project, and what are the migration traps (`_app` vs root `layout`, `_document`, routing hooks)?

## 2. Server Components vs Client Components in Next.js

What is the default in `app/`? What cannot run in a Server Component? What does `'use client'` actually mean (file boundary vs “this component only”)? Why is putting `'use client'` on a huge leaf-importing module expensive? How do you pass children from server to client as a composition pattern?

## 3. File-system routing conventions

Explain `layout.tsx`, `page.tsx`, `template.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`, `default.tsx`, and `route.ts`. How do **nested layouts** persist state across navigations? When would you use `template.tsx` instead of `layout.tsx`? What is a **route group** `(marketing)` vs a **dynamic** `[id]` vs **catch-all** `[...slug]` vs optional `[[...slug]]`?

## 4. Parallel routes and intercepting routes

What problem do `@slot` parallel routes solve (dashboards, modals)? What is `default.tsx` for? How do intercepting routes (`(.)photo`, `(..)`, `(...)`) implement a modal that still has a URL, and what happens on hard refresh vs client navigation?

## 5. Rendering models: SSG, SSR, ISR, and dynamic

Define static, server-rendered, and incremental static regeneration in App Router terms (`generateStaticParams`, `dynamic`, `revalidate`). What forces a route to be **dynamic** (cookies, headers, uncached fetch, `searchParams` in some versions)? How do you opt a page into static vs always-dynamic?

## 6. The Next.js caching layers

Distinguish: **request memoization**, **Data Cache**, **Full Route Cache**, and **Router Cache**. What do `fetch` options `cache: 'no-store'`, `next: { revalidate: n }`, and `cache: 'force-cache'` do? How do `revalidatePath` and `revalidateTag` differ? Name a bug caused by the **client Router Cache** after a mutation.

## 7. Data fetching patterns and waterfalls

Why can `async` Server Components fetch without `useEffect`? How does Next **dedupe** `fetch` in one request? When do you get a **waterfall** (parent await then child await), and how do you parallelize (`Promise.all`, fetch in parent and pass, or `use()`)? When is a Client Component + React Query still the right tool?

## 8. Streaming, `loading.tsx`, and Suspense

How does `loading.tsx` relate to `<Suspense>`? What HTML does the user receive first on SSR with streaming? Difference between a static skeleton for the whole page vs Suspense around a slow widget. How do you avoid the “layout + spinner flash” on every client navigation?

## 9. Errors: `error.tsx`, `global-error.tsx`, `not-found.tsx`

What is an error boundary’s **scope** in the app tree? Why must `error.tsx` be a Client Component? Difference between `notFound()`, `redirect()`, and throwing. When does `global-error` render vs a nested `error.tsx`? How do you recover (reset) after a failed Server Action or fetch?

## 10. Route Handlers (`app/api/.../route.ts`) vs Pages API routes

Compare `GET`/`POST` handlers, `Request`/`Response`, and `cookies()`/`headers()`. When should a mutation be a Route Handler vs a **Server Action** vs a Server Component form POST? CORS, `export const runtime`, and streaming a response — when do you care?

## 11. Server Actions

How do you declare and call a Server Action from a form and from a Client Component? What can be serialized as arguments? Security: why is an Action a **public endpoint**, and what must you still check (authz, origin, CSRF in older setups)? How do `useFormStatus`, `useActionState` / `useFormState`, and `revalidatePath` fit together? What happens if the action throws?

## 12. Middleware: `middleware.ts`

Where does middleware run (Edge)? What can it do well (redirects, A/B, geolocation, auth gate)? What should it **not** do (heavy JWT crypto without care, DB calls, large bundles)? How do `matcher` config and `NextResponse.next()` / `rewrite` / `redirect` differ? Cookie-setting pitfalls on the request vs response.

## 13. `next/image` and fonts

What problems does `Image` solve (CLS, srcset, lazy, optimization pipeline)? When must you set `sizes`? Difference between static import, remote `src` + `remotePatterns`, and `fill` + `object-fit`. Why can a missing `width`/`height` or wrong `sizes` **hurt** LCP? What does `next/font` change about FOIT/FOUT and layout shift?

## 14. Metadata, Open Graph, and the Metadata API

Compare `export const metadata`, `generateMetadata`, and `generateViewport`. How do **nested layouts** merge titles (`title.template`)? When must metadata be dynamic? How do `sitemap.ts` / `robots.ts` work? Pitfall: generating OG images vs leaking `draft` content.

## 15. Environment variables, secrets, and `server-only`

Which vars are inlined into the **client** bundle (`NEXT_PUBLIC_*`)? How can a secret leak (importing a server module into a Client Component, logging, `experimental` exposure)? What does `import 'server-only'` do? Where should `DATABASE_URL` be read, and how do you configure env per environment on Vercel vs Docker?

## 16. `next.config`: redirects, rewrites, headers, and images

When do you use `redirects` vs `rewrites` vs middleware? How do `headers()` security defaults (or missing CSP) show up in interviews? `output: 'standalone'` vs static export (`output: 'export'`) — what features **die** on static export? `transpilePackages` and monorepos.

## 17. Auth, cookies, and session in the App Router

How do you read cookies in a Server Component vs Route Handler vs middleware? Why is `cookies()` a dynamic API? Sketch a session pattern: httpOnly cookie, server-side validation, passing a **safe** user object to client leaves. Why must you not put the raw session in a Client Component fetch to a third party? How do you protect a Server Action?

## 18. Edge vs Node runtimes

`export const runtime = 'edge'` vs default Node. What APIs are missing on Edge (native Node modules, some auth SDKs)? When is Edge a win (low latency middleware, simple JWT) vs a loss (cold start myths, DB drivers, CPU)? How does this interact with Region / Vercel Fluid / self-hosting?

## 19. Client navigation, prefetch, and the Router Cache

What does `<Link>` prefetch by default, and when should you disable it? `useRouter()`, `usePathname()`, `useSearchParams()` — which force Client Components and which can stall static rendering? How do you update the URL without a full refetch? After a Server Action, why might the UI show **stale** data until refresh, and how do you fix it?

## 20. Performance and architecture at scale

A dashboard is slow. Rank: RSC payload size, client waterfalls, `'use client'` too high, barrel `index.ts` pulling a chart lib, uncached `fetch` on every nav, huge images, blocking `await` in a root layout, missing `loading.tsx`. What is Partial Prerendering (PPR) trying to solve? How would you split a marketing site vs an authenticated app in the same Next repo (route groups, multiple roots, or separate apps)?
