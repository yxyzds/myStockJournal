# CSS — 20 Interview Questions

Mid-to-senior frontend. Cover these without looking at `answers-css.md`. Aim for: what the browser does, why a layout breaks, and what you would ship.

---

## 1. Cascade, specificity, inheritance, and `@layer`

Explain how the cascade actually decides a winner: origin, importance, layers, specificity, then order. How do inline styles, `!important`, and `@layer` interact? Why might a utility class lose to a component class, and how would you structure layers in a design system?

## 2. Box model, `box-sizing`, and margin collapse

What is included in `width` under `content-box` vs `border-box`? When do vertical margins collapse, and when do they **not** (BFC, flex/grid items, `overflow`, padding)? Predict the used height of the inner box:

```css
.outer { margin: 20px 0; }
.inner { margin: 30px 0; height: 100px; }
```

## 3. Containing block, formatting contexts, and BFC

What is a containing block for `absolute` vs `fixed` vs `sticky`? What creates a Block Formatting Context, and which classic bugs does a BFC fix (float containment, margin collapse)? How do Flex and Grid formatting contexts differ from a BFC?

## 4. Positioning: `relative`, `absolute`, `fixed`, `sticky`

For each `position` value: what it is offset against, whether it leaves a gap in normal flow, and a production pitfall. Why does `position: sticky` often “fail”? Why does `fixed` inside a `transform`/`filter`/`will-change` ancestor stop sticking to the viewport?

## 5. Stacking contexts and `z-index`

When is `z-index` ignored? List properties that create a **new stacking context**. Why can a child with `z-index: 9999` still paint *under* a sibling of its parent? How would you debug a “modal under the header” bug without raising numbers forever?

## 6. Flexbox: alignment, shrinking, and `min-width: auto`

Explain `flex-grow`, `flex-shrink`, `flex-basis`, and the difference between `justify-content` and `align-items`. Why does a flex child refuse to shrink below its content (text/images), and what is the usual fix? When is `gap` better than margins?

## 7. CSS Grid: tracks, areas, and overlapping

Compare `fr`, `minmax`, `auto`, and `min-content` / `max-content`. What does `grid-template-areas` buy you vs line-based placement? How do you overlap items, and how does `dense` packing change auto-placement? When would you nest flex *inside* a grid cell rather than making everything grid?

## 8. Intrinsic sizing and the “holy grail” of overflow

Why does `width: 100%` on a child sometimes overflow the parent? Explain `min-content`, `max-content`, `fit-content`, and `1fr`’s `minmax(auto, 1fr)` trap. How do you make a table/grid column truncate with ellipsis *and* not blow out the page?

## 9. Responsive layout: units, viewport, and container queries

Compare `px`, `em`, `rem`, `%`, `vw`/`vh`, `dvh`/`svh`/`lvh`, and `cqw`. Why is `100vh` a mobile bug? When do **container queries** beat media queries? What is a container query length unit, and what must you set on the ancestor?

## 10. Logical properties, writing modes, and RTL

Why prefer `margin-inline-start` over `margin-left`? How do `inset-inline`, `border-block`, and `inline-size` map in LTR vs RTL vs vertical writing? What still does *not* flip automatically (shadows, transforms, icons), and how do you handle it?

## 11. Selectors: `:is`, `:where`, `:has`, and specificity traps

What is the specificity of `:is()` vs `:where()`? How does `:has()` change what CSS can express (parent/sibling selection), and what are the performance/style-invalidation concerns? Critique a selector like `div div span.active > a` for a large app.

## 12. Custom properties (CSS variables)

How do custom properties inherit and compute? Why does `--x: 10` without a unit break `calc()`? Difference between a property defined on `:root` vs a component, and how you theme (light/dark) without duplicating every rule. Can you animate custom properties, and what does `@property` add?

## 13. Colors, contrast, and modern color spaces

Compare sRGB hex, `rgb`, `hsl`, `color-mix()`, and `oklch()`. Why is OKLCH nicer for design tokens (perceptual lightness)? How do you keep WCAG contrast when generating hover/disabled from a brand color? What does `color-scheme` / `light-dark()` do?

## 14. Typography: rhythm, wrapping, and font loading

How do `line-height`, `line-clamp`, `text-wrap: balance` / `pretty`, and `overflow-wrap` vs `word-break` differ? What is FOIT vs FOUT, and how do `font-display` and `size-adjust` help? Why can `line-height: 1` clip descenders and Arabic/Thai?

## 15. Transforms, compositing, paint, and `will-change`

Which CSS changes trigger layout vs paint vs composite? Why is `transform`/`opacity` cheaper than `top`/`left` or `box-shadow` on every frame? When does `will-change` help, and when does it **hurt** (memory, extra layers)? How do transforms affect `fixed`, overflow, and `object-fit`?

## 16. Transitions, animations, and View Transitions

Compare transitions, `@keyframes`, and the View Transitions API. Why can’t you transition `display: none` classically, and what are the workarounds (`@starting-style`, `transition-behavior: allow-discrete`, grid `0fr` → `1fr`)? When is JS animation (WAAPI) the right tool?

## 17. Overflow, scrolling, sticky, and scroll snapping

Explain `overflow: auto` vs `overlay` vs `clip`. How do you make a column scroll **inside** a full-height app shell without the page scrolling? Pitfalls of `overscroll-behavior`, nested scroll, and `position: sticky` inside `overflow: hidden`. What does `scroll-margin` do for anchor links under a fixed header?

## 18. Images, media, and layout shift (CLS)

How do `width`/`height` attributes, `aspect-ratio`, and `object-fit` prevent CLS? Difference between `srcset` + `sizes` and CSS `image-set()`. Why do background images not reserve space? How would you crop a 16:9 video in a 1:1 tile without distortion or overflow?

## 19. Accessibility in CSS

What must remain possible at `200%` zoom and with `prefers-reduced-motion`? Why is `outline: none` dangerous, and how do you style `:focus-visible` correctly? Contrast `visibility: hidden`, `display: none`, `opacity: 0`, and `sr-only` clip patterns for screen readers. When is `content` on `::before` an a11y bug?

## 20. Architecture and performance of CSS at scale

Compare BEM, utility-first (Tailwind), CSS Modules, and CSS-in-JS for: specificity wars, duplication, runtime cost, and deletion safety. What is `@layer`’s role? Name engine costs: style recalc, selector right-to-left matching, unused CSS in the bundle, and `contain` / `content-visibility`. When would you choose `content-visibility: auto` on a long list?
