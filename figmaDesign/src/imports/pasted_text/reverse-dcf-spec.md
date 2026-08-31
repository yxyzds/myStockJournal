Design a high-fidelity Desktop Web page for MyStockJournal: Valuation · Reverse DCF.

This is the first generation of the page.

============================================================
PRODUCT CONTEXT
============================================================

MyStockJournal formula:
- Core: record investment decisions
- Hook: AI Rate My Transaction
- Support: valuation + filings

Valuation is a stock-level tool (Stock → Valuation).
AI assists and challenges assumptions; never gives Buy/Sell advice.

Reverse DCF purpose:
Answer: “What is the market pricing in?”
NOT: “What is my fair value?” (that is forward DCF)

Relationship to DCF:
- SAME page shell, shared anchors/drivers where appropriate
- DIFFERENT hero narrative and primary output
- Shared data source for WACC / margins / terminal g / cash / debt / shares / TTM revenue
- Growth is an OUTPUT here (implied), not the main user input

============================================================
CORE MATH (KEEP CORRECT)
============================================================

Forward DCF:
Assumptions → FCF path + TV → discount at WACC → EV → +Cash −Debt → Equity → FV/share

Reverse DCF:
Start from Current Price (and shares) → target Equity Value → target EV
Hold constant: WACC, terminal g, FCF margin path, TTM revenue, cash, debt, shares
Solve for implied growth (e.g. Implied Revenue CAGR Y1–5, with Y6–10 rule stated)
So that PV(FCFs)+PV(TV) reconciles to market-implied EV

Show clearly:
Implied growth is solved; fair-value cards are NOT the primary hero.

============================================================
TOP BAR (SYNC WITH DCF SHELL)
============================================================

- Back: {Ticker} · Stock
- Title: {Ticker} · Valuation · Reverse DCF
- Method tabs: DCF | Reverse DCF | P/E | EV/EBITDA | SOTP
- Actions: Save · Open in DCF · Use in decision
  (No primary “Set as My Fair Value” as the main action here;
   if shown, make secondary / explain it belongs to forward models)

============================================================
PAGE HIERARCHY (IMPORTANT — DO NOT CLONE DCF HERO)
============================================================

1) Hero: Market-implied conclusion
2) Comparison: Market-implied vs Your assumptions
3) Held-constant drivers/anchors (shared with DCF)
4) Valuation bridge under market price (compact)
5) 10-year path under implied assumptions (DEFAULT COLLAPSED)
6) AI Challenge

============================================================
1) HERO — WHAT IS THE MARKET PRICING IN?
============================================================

Large, clear block:

Current Price: $248.00
Implied Revenue CAGR: XX.X%   ← biggest number
Helper sentence:
“At $248, the market is implying approximately XX.X% revenue growth over the next 5 years (given your held-constant margins, WACC, and terminal growth).”

Optional secondary implied metrics (smaller):
- Implied Y6–10 growth (if model uses two-stage rule)
- Implied terminal contribution / note

Do NOT make My Model Fair Value the largest element on this page.

============================================================
2) COMPARISON STRIP (CORE PRODUCT VALUE)
============================================================

Side-by-side or comparison table:

                Market-implied     Your view (from DCF Base)
Growth Y1–5     22.4%              19.0%
Growth Y6–10    12.0% (rule)       11.0%
FCF Margin Y1   25% (held)         25%
WACC            9% (held)          9%
Terminal g      4% (held)          4%

Status cue examples:
- “Market implies faster growth than your base”
- “Market-implied growth is below your assumptions”

CTA:
- Edit my assumptions in DCF
- Apply my DCF assumptions as held-constants (refresh implied growth)

============================================================
3) HELD-CONSTANT INPUTS (SYNC STYLE WITH DCF)
============================================================

Use the same visual language as DCF’s split:

A) Anchors (from filings / market) — read-only default
- TTM Revenue
- Cash & Investments
- Total Debt
- Diluted Shares
- Current Market Price (locked source for reverse solve)
- Past 5Y Revenue CAGR (reference only)

B) Held-constant drivers — editable, but labeled clearly
Label:
“Held constant to solve for implied growth”
Fields:
- WACC
- Terminal Growth (g)
- FCF Margin Y1
- FCF Margin Terminal
- (Optional) Y6–10 growth rule: fade / fixed input used as constraint, not the solved variable

Explain microcopy:
“Cash and debt are not part of yearly FCF. They convert EV into equity value.”
“Changing held-constants changes the implied growth needed to justify the current price.”

============================================================
4) MARKET-PRICE VALUATION BRIDGE (COMPACT)
============================================================

Show the reverse bridge clearly but secondary to implied growth:

- Market Cap / Price × Shares
- Target Equity Value (from price)
- − Cash + Debt adjustments as needed to state Target EV
- Target EV
- Of which: PV of projected FCFs + PV of Terminal Value (under implied path)

Keep this calmer/smaller than the hero implied CAGR.
No Buy/Sell badge.

============================================================
5) 10-YEAR FORECAST — DEFAULT COLLAPSED
============================================================

Collapsed header must still communicate value, e.g.:
“10-Year path under market-implied growth · Terminal Value $… · Show table”

Expanded rows:
- Revenue
- YoY Growth (implied path)
- FCF
- FCF Margin
- Terminal Value in final year

Mark terminal year.
All figures $M.
Do not default-expand.

============================================================
6) AI CHALLENGE
============================================================

Examples:
- Implied growth >> history / your base → “What would need to be true?”
- Implied growth << your base → “Market may be underwriting a more cautious path than you are.”

AI never recommends Buy/Sell.
CTA options:
- Write journal note
- Open DCF
- Review peers / filings evidence (optional)

============================================================
DATA SYNC RULES WITH DCF
============================================================

Communicate in UI (subtle):
- Shared: anchors + WACC + margins + terminal g
- Not shared as editable growth: implied growth is solved here; your growth lives in DCF
- Button: Open in DCF (carry held-constants; show your growth assumptions there)

============================================================
VISUAL STYLE
============================================================

Same design system as DCF Valuation page:
Clean / premium / calm analytical workbench
Light theme
Progressive disclosure
Green/amber only for comparison cues and warnings
No crypto glow, no trading-terminal clutter, no SELL stamp

============================================================
EXPLICITLY FORBID
============================================================

- Cloning DCF with Fair Value as the main hero
- Asking user to input growth as the primary field on Reverse DCF
- Dual conflicting discount rates
- Default-expanded dense 10-year table as first content
- Buy/Sell recommendation
- Treating Reverse DCF as the place to set My Fair Value by default

============================================================
OUTPUT
============================================================

One high-fidelity Desktop Reverse DCF mock that shows:
1) Same shell as DCF, different narrative
2) Hero = Current Price + Implied growth
3) Market-implied vs Your assumptions comparison
4) Held-constant drivers + anchors
5) Compact market-price bridge
6) Collapsed 10-year implied path with Terminal Value in title
7) AI Challenge without trade advice