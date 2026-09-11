# CSS — Answers

Numbered to match `questions-css.md`. Use these after attempting the questions.

---

## 1. Cascade, specificity, inheritance, and `@layer`

Winner is chosen in this order (simplified):

1. **Origin + importance:** user-agent < user < author; then author `!important` beats author normal; user `!important` beats author `!important`; animations/transitions have their own steps.
2. **`@layer`:** unlayered author styles beat layered ones. Within layers, **later** layers win. `!important` in layers reverses: earlier important layers win.
3. **Specificity:** inline style > IDs > classes/attributes/pseudos > elements. `:where()` is **zero**; `:is()` / `:not()` take the **most specific argument**.
4. **Order:** last equal-specificity rule wins.

Inline `style=""` beats classes unless a stylesheet uses `!important`. `!important` inside a low layer can still lose to `!important` in an earlier important layer — don’t fight with `!important`; use layers.

Design-system pattern:

```css
@layer reset, tokens, base, components, utilities;
```

Utilities last so `mt-4` can override a component. Without layers, a component `.Card .title` (0,2,0) beats utility `.text-sm` (0,1,0).

Inherited properties (`color`, `font-*`) inherit the **computed** value; `margin` does not.

---

## 2. Box model, `box-sizing`, and margin collapse

`content-box` (default in raw CSS): `width` is **content only**; padding + border add on.  
`border-box`: `width` includes padding + border (content shrinks). Almost always set:

```css
*, *::before, *::after { box-sizing: border-box; }
```

**Margin collapse:** adjoining **vertical** margins of block boxes in normal flow combine to `max(a, b)` (with signed-min rules for negatives). Horizontal margins never collapse.

They **do not** collapse if: flex/grid items, `absolute`/`float`, a BFC root and its child in some cases, padding/border/gap between them, `overflow` ≠ `visible` on the parent (creates BFC), `display: flow-root`.

Snippet: `.inner`’s 30px and `.outer`’s 20px collapse to **30px** above/below the pair (if they’re the only in-flow blocks). Used inner height is **100px**; the collapsed margin is outside.

---

## 3. Containing block, formatting contexts, and BFC

- **Static/relative:** containing block is the content box of the nearest block ancestor.
- **Absolute:** nearest ancestor with `position` ≠ `static` (or `transform` / `filter` / `perspective` / `contain: paint` / `will-change` of those — they create a containing block). Offset against **padding edge**.
- **Fixed:** normally the **viewport**; same transform/filter ancestors make it behave like absolute.
- **Sticky:** nearest **scroll ancestor**; containing block is that ancestor’s padding box.

A **BFC** is created by `float`, `overflow` ≠ `visible`, `display: flow-root` / `inline-block` / `flex` / `grid` / `table-cell`, `contain: layout`, etc.

BFC fixes: parent **contains floats** (height doesn’t collapse); **stops margin collapse** through the parent; isolates internal layout.

Flex/Grid items participate in **flex/grid formatting contexts**, not a nested BFC of the item’s contents until the item itself establishes one. Flex/grid items are **blockified**; their vertical margins don’t collapse with siblings.

---

## 4. Positioning: `relative`, `absolute`, `fixed`, `sticky`

| Value | Offset against | In flow? | Pitfall |
|---|---|---|---|
| `static` | — | yes | `top`/`z-index` ignored |
| `relative` | itself | yes (gap kept) | used as abs containing block accidentally |
| `absolute` | positioned ancestor | no | missing positioned parent → jumps to page |
| `fixed` | viewport (usually) | no | trapped by `transform` on ancestor |
| `sticky` | scrollport | yes | fails if **any** ancestor has `overflow: hidden/auto` and isn’t the intended scroller; needs inset (`top: 0`); parent too short |

Sticky “fails” most often because a parent clips overflow or the sticky element’s parent scrolls away (sticky is limited to its containing block height).

`transform`, `filter`, `perspective`, `backdrop-filter`, `contain: paint`, `will-change: transform` on an ancestor make `fixed` contain to that ancestor — modals inside transformed pages look “stuck” mid-screen.

---

## 5. Stacking contexts and `z-index`

`z-index` only applies to **positioned** boxes (`position` ≠ `static`) or **flex/grid items**, and only **inside** the current stacking context.

New stacking contexts include: `opacity < 1`, `transform` other than `none`, `filter`, `isolation: isolate`, `will-change` of those, `position` + `z-index` ≠ auto, `fixed`/`sticky` in some browsers, `mix-blend-mode` ≠ `normal`.

A child `z-index: 9999` cannot escape its parent’s context. If the header is `z-index: 2` and the modal’s parent is `z-index: 1` (or auto with a transform), the modal paints under the header.

Debug: find who created the context (DevTools “Stacking Context” / look for transform/opacity). Raise **that** ancestor, or `isolation: isolate` on a known root, or portal the modal to `document.body`. Don’t invent `z-index: 99999`.

---

## 6. Flexbox: alignment, shrinking, and `min-width: auto`

`flex: grow shrink basis`. Default `0 1 auto`. `flex: 1` → `1 1 0%` in the spec’s common interpretation of the `1` shorthand (`1 1 0`).

- **Main axis:** `justify-content` (pack items).
- **Cross axis:** `align-items` (one line) / `align-content` (multi-line).
- Per-item: `align-self`, `margin: auto` absorbs extra space.

**`min-width: auto` (default):** a flex item’s min size is its **content minimum**, so long words / images / `white-space: nowrap` prevent shrinking. Fixes: `min-width: 0` (or `min-height: 0` in a column flex), `overflow: hidden`, or `flex-basis: 0` with `grow: 1`.

`gap` does not collapse and doesn’t require last-child margin resets — prefer it over `margin-right` on children.

---

## 7. CSS Grid: tracks, areas, and overlapping

- `fr` — share **free** space after definite tracks.
- `minmax(a, b)` — clamp.
- `auto` — typically max-content-ish, stretchable.
- `min-content` / `max-content` — intrinsic.

**Trap:** `1fr` = `minmax(auto, 1fr)`, so a track won’t shrink below content. Use `minmax(0, 1fr)` to allow shrink/truncate.

`grid-template-areas` names regions — readable for page chrome. Line-based (`grid-column: 1 / 3`) is better for overlapping and dense data UIs.

Overlap: two items on the same cells; later in DOM / higher `z-index` paints on top.

`grid-auto-flow: dense` backfills holes (may reorder visually — a11y/tab order still follows DOM).

Nest **flex** in a cell for a toolbar (alignment in one dimension) when you don’t need two-dimensional tracks.

---

## 8. Intrinsic sizing and the “holy grail” of overflow

`width: 100%` is 100% of the **containing block**. If the child also has padding/border (`content-box`), min-content larger than parent, or `100%` plus margins, it overflows. Flex/grid `auto` min-size (see Q6/Q7) is the usual “100% child blows the page” cause.

- `min-content`: smallest wrap (longest word / image).
- `max-content`: no wrap.
- `fit-content`: `min(max-content, max(min-content, available))`.

Ellipsis in a grid/flex column:

```css
.col { min-width: 0; }
.col p {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

Without `min-width: 0`, the track grows and the page scrolls.

---

## 9. Responsive layout: units, viewport, and container queries

| Unit | Relative to |
|---|---|
| `px` | not scalable with user font if abused for type |
| `em` | parent font-size |
| `rem` | root font-size (user zoom friendly) |
| `%` | containing block (width vs height rules differ) |
| `vw`/`vh` | viewport; `100vh` **includes** mobile browser chrome → layout jumps |
| `dvh`/`svh`/`lvh` | dynamic / small / large viewport |
| `cqw` | **container** query width |

Prefer `dvh` for full-screen sheets; `100dvh` still needs `overflow` care.

**Container queries** respond to a **component’s** width, not the viewport — cards in a sidebar vs main. Ancestor needs `container-type: inline-size` (and optional `container-name`). Then `@container (min-width: 400px)` and units `cqw`, `cqi`, `cqh`.

Media queries: device/user prefs (`prefers-color-scheme`, `pointer: coarse`). Don’t replace those with containers.

---

## 10. Logical properties, writing modes, and RTL

Physical `left`/`right` break in `dir="rtl"` and vertical writing. Logical:

- `inline` — text flow (left↔right in LTR, reversed in RTL)
- `block` — stacking direction (top↔bottom in horizontal writing)

`margin-inline-start` is the “start” side. `inline-size` ≈ width in horizontal modes.

**Won’t auto-flip:** `box-shadow: 4px …` (physical px), `transform: translateX(8px)`, background positions, many icons (chevrons). Use `margin-inline-start`, `scaleX(-1)` on directional icons when `dir=rtl`, or `logical` shadows via custom properties. Test with `dir="rtl"` on `<html>`.

---

## 11. Selectors: `:is`, `:where`, `:has`, and specificity traps

- `:is(.a, #id)` specificity = **highest** argument (`#id`).
- `:where(.a, #id)` specificity = **0** — ideal for reset/base.

`:has(.child)` lets you style a parent/sibling (`label:has(:checked)`, `form:has(:invalid)`). It can invalidate a lot of style on DOM changes; keep it **shallow** and avoid `:has(*)` on huge trees.

`div div span.active > a` is brittle (DOM depth), higher specificity than utilities, slow-ish in the sense of **maintenance** more than micro-benchmarks. Prefer classes on the leaf you control: `.NavLink.is-active`.

Right-to-left matching: engines try the **rightmost** simple selector first. Over-qualified `html body div.foo` is wasted work and specificity debt.

---

## 12. Custom properties (CSS variables)

Custom properties inherit as specified values. They are substituted at **computed-value** time. `--x: 10` is a token, not `10px`; `calc(var(--x) * 2)` fails unless `--x: 10px` or `calc(var(--x) * 2px)` with a number registered via `@property`.

`:root` / `html` — global tokens. Component `.Card { --pad: 1rem }` — local overrides that descendants `var(--pad)` inherit.

Theming: set `--bg`, `--fg` on `:root` and `[data-theme="dark"]`; components only use `var()`. One rule set, two token bags.

Animating: unregistered properties often **flip** at 50%. `@property --angle { syntax: '<angle>'; inherits: false; initial-value: 0deg; }` enables interpolation.

`color-mix(in oklch, var(--brand), white 20%)` for hover — keep tokens in one space.

---

## 13. Colors, contrast, and modern color spaces

sRGB hex/`rgb` is device-ish and not perceptually uniform. `hsl` is better for humans but lightness ≠ perceived lightness. **OKLCH**: `L` is closer to perceived brightness; keep `L` fixed and rotate hue for palettes; adjust `C` for disabled (lower chroma) rather than mixing gray badly.

`color-mix(in oklch, var(--brand) 80%, white)` — check contrast with APCA/WCAG against `--bg`. Don’t trust “lighten 10%” in HSL for AA.

`color-scheme: light dark` tells the UA to paint native controls. `light-dark(white, black)` picks by used scheme. `prefers-color-scheme` media still used for tokens.

---

## 14. Typography: rhythm, wrapping, and font loading

- `line-height: 1.5` unitless is relative to the element’s font — usually best.
- `line-height: 1` (or `100%`) **clips** glyphs with diacritics, CJK, Arabic.
- `-webkit-line-clamp` + `box-orient` + `overflow: hidden` for multiline ellipsis.
- `text-wrap: balance` — headings; `pretty` — avoid orphans in body (support varies).
- `overflow-wrap: anywhere` / `break-word` — break long URLs; `word-break: break-all` is harsher (CJK sometimes intended).

**FOIT:** invisible text until font loads (`font-display: block`). **FOUT:** fallback then swap (`swap`). `optional` skips late fonts (good for repeat views). `next/font` / `size-adjust` / fallback metrics reduce CLS from metric mismatch.

---

## 15. Transforms, compositing, paint, and `will-change`

Roughly:

- **Layout:** width, height, margin, font-size, `top`/`left` (non-transform).
- **Paint:** color, box-shadow, border-radius, background.
- **Composite:** `transform`, `opacity` on their own layer.

Animate `transform`/`opacity` for 60fps. Animating `box-shadow` or `top` is expensive.

`will-change: transform` promotes a layer **early**. Overuse = RAM, extra compositing, can create containing blocks (see Q4). Set it only before an animation; remove after.

Transforms create a containing block and may cause `overflow: hidden` to clip differently; `object-fit` is independent (replaced content).

---

## 16. Transitions, animations, and View Transitions

**Transitions:** interpolate when a property changes.  
**`@keyframes`:** explicit timeline, can loop.  
**View Transitions API:** snapshot old/new DOM and morph (`document.startViewTransition`); CSS `::view-transition-old/new`.

`display: none` is discrete. Workarounds:

- `@starting-style` + `transition-behavior: allow-discrete` (modern)
- animate `opacity` + `visibility` (keep in a11y tree unless `visibility`/`inert`)
- grid `grid-template-rows: 0fr` → `1fr` for accordion
- `max-height` hacks (fragile)

WAAPI / JS: interruptible gesture-driven animation, scroll-linked (or CSS `animation-timeline: scroll()`), complex sequences. Prefer CSS for simple hover/focus.

---

## 17. Overflow, scrolling, sticky, and scroll snapping

`auto` — scrollbars when needed. `scroll` — always. `hidden` — clip, may still scroll programmatically. `clip` — clip, no programmatic scroll. `overlay` was nonstandard.

App shell:

```css
html, body, #root { height: 100%; overflow: hidden; }
.main { flex: 1; min-height: 0; overflow: auto; }
```

`min-height: 0` is required in nested flex (Q6).

`overscroll-behavior: contain` stops scroll chaining to the body (modals). Sticky inside `overflow: hidden` is not sticky relative to the viewport.

`scroll-margin-top: 4rem` offsets scroll-into-view / `:target` for a fixed header. `scroll-snap-type` + `scroll-snap-align` for carousels; test keyboard and reduced motion.

---

## 18. Images, media, and layout shift (CLS)

Browser uses HTML `width` and `height` (or CSS `aspect-ratio`) to reserve space **before** the image loads. `object-fit: cover` + `object-position` crops inside that box.

`srcset` + `sizes` — pick a **file** by layout width. `image-set()` — CSS backgrounds (resolution/format). Backgrounds **do not** contribute to layout; set an explicit `aspect-ratio` or min-height on the box.

16:9 video in 1:1:

```css
.tile { aspect-ratio: 1; overflow: hidden; }
.tile video { width: 100%; height: 100%; object-fit: cover; }
```

Don’t use `width: 100%; height: auto` if the tile is square — you’ll get letterboxing or overflow.

---

## 19. Accessibility in CSS

Zoom 200%: layouts must reflow (`px`-only fixed widths fail). Don’t disable zoom. `prefers-reduced-motion: reduce` → shorten/stop decorative motion.

`outline: none` without a **visible** `:focus-visible` replacement fails keyboard users. Style:

```css
:focus { outline: none; } /* avoid this globally */
:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }
```

| Technique | In a11y tree / layout |
|---|---|
| `display: none` | removed |
| `visibility: hidden` | invisible, may still affect some AT; no pointer |
| `opacity: 0` | still there (focusable unless `inert`/`tabindex=-1`) |
| `.sr-only` clip | visually hidden, **readable** by SR |

`content: 'required'` on `::before` is often **not** announced reliably and not selectable; put real text in the DOM.

---

## 20. Architecture and performance of CSS at scale

| Approach | Pros | Cons |
|---|---|---|
| BEM | explicit, low collision | verbose, specificity still creeps |
| Tailwind / utilities | fast UI, layers | HTML noise, design token discipline required |
| CSS Modules | local by default | composition/theming ceremony |
| CSS-in-JS runtime | colocated | runtime cost, FOUC, harder CSP |
| Zero-runtime (Linaria, compiled) | colocate without runtime | build complexity |

`@layer` lets utilities and components coexist without specificity wars.

Engine: style recalc on DOM/class changes; keep selectors simple; **bundle size** of unused CSS is the real tax. `contain: layout style paint` isolates a widget. `content-visibility: auto` skips render of offscreen long lists (needs `contain-intrinsic-size` to avoid scrollbar jump). Measure with Performance panel (Recalc Style / Layout / Paint), not folklore about “CSS is slow.”
