Revise the existing MyStockJournal DCF Valuation page layout.
Keep the overall product context and visual system, but restructure hierarchy for clarity and progressive disclosure.

This is a layout/IA revision prompt for the current DCF page (Assumptions + forecast + valuation bridge + fair value cards).

============================================================
GOALS
============================================================

1) Make it obvious what is FIXED/ANCHOR vs what the user should EDIT
2) Default-collapse the 10-year FCF table
3) Surface Terminal Value prominently in section titles / summary (not buried only in a grid cell)
4) Keep the correct valuation bridge: FCF → TV → EV → +Cash −Debt → Equity → FV/share
5) Optimize scanning: judgment first, outputs second, details on demand
6) No Buy/Sell recommendation

============================================================
PAGE HIERARCHY (TOP → BOTTOM)
============================================================

A. Top bar (unchanged intent)
- Back to Stock
- {Ticker} · Valuation · DCF
- Method tabs
- Save / Set as My Fair Value / Use in decision

B. Result summary (MOVE UP or keep strong near top-of-results)
- My Model Fair Value (large)
- Current Market Price
- MOS / “Price is X% above/below fair value”
- Show Terminal Value summary metric near results title (see below)

C. Edit zone: Assumptions
- Split into two visual groups: “Anchors (from filings)” and “Your drivers (edit these)”

D. Valuation Bridge (always visible core chain)

E. 10-Year FCF Forecast
- COLLAPSED by default
- Expandable accordion/section

============================================================
1) SEPARATE FIXED vs EDITABLE INPUTS
============================================================

Create two clearly different panels/styles.

------------------------------------------------
PANEL A — Anchors (from filings / market)
Style: read-only by default, muted, lock icon optional
Label helper: “Prefetched · override only if needed”
Fields:
- TTM Revenue
- Cash & Investments
- Total Debt
- Diluted Shares
- Current Market Price (if shown in inputs; otherwise only in results)
- Past 5Y Revenue CAGR (reference only, explicitly “not used in model”)

Interaction:
- Default locked/read-only
- Secondary control: “Unlock to override”
- Do NOT present these as the primary fill-in form

------------------------------------------------
PANEL B — Your drivers (focus area)
Style: stronger emphasis, primary inputs
Label helper: “These judgments drive FCF, TV, and EV”
Fields (only these as primary edits):
- Revenue Growth Y1–5
- Revenue Growth Y6–10
- Terminal Growth (g)
- WACC (discount rate)
- FCF Margin Y1
- FCF Margin Terminal

Keep AI suggested values, but:
- Show “AI: x%” mainly when user differs from AI
- Or show subtly; avoid noisy identical AI labels on every field

Optional compact AI Initial Valuation (Bear/Base/Bull):
- Keep as prefill chooser
- Secondary to the live Fair Value result cards
- CTA: Reset to AI base

============================================================
2) TERMINAL VALUE IN TITLES / SUMMARY
============================================================

Do not hide Terminal Value only inside the year grid.

Requirements:
- In the results/bridge header area, show a metric chip or subtitle including Terminal Value, e.g.:
  “Valuation Bridge · Terminal Value $XX,XXXM (PV $XX,XXXM)”
- Or two chips near Fair Value:
  - Terminal Value (undiscounted, final year)
  - PV of Terminal Value
- When 10-year section is collapsed, the collapsed header must still show Terminal Value summary, e.g.:
  “10-Year FCF Forecast  ·  Terminal Value $110,705M  ·  Show table”

User must understand TV is a major part of EV without opening the full table.

============================================================
3) 10-YEAR CASH FLOW TABLE = DEFAULT COLLAPSED
============================================================

Section title:
10-Year FCF Forecast
Collapsed subtitle example:
“Revenue → FCF by year · Terminal Value in final year · All figures $M”

Default state: COLLAPSED
Control: “Show 10-year forecast” / chevron

Expanded content rows:
- Revenue
- YoY Growth
- FCF
- FCF Margin
- Terminal Value (final year only)
- Total (final year = FCF + TV)

Notes:
- Mark terminal year column
- Updates live when drivers change
- Do not force this table as the first visual block

============================================================
4) VALUATION BRIDGE (KEEP, SLIGHTLY OPTIMIZE)
============================================================

Always visible core chain:
- Enterprise Value (EV)
- + Cash & investments
- − Total debt
- = Equity Value
- ÷ Diluted shares
- = Fair Value / Share
- Current market price
- Margin of Safety

Advanced detail (can be nested/ Progressive):
- PV of projected FCFs
- PV of Terminal Value
  (these explain EV; can be expandable under EV)

Keep right-side large cards:
- My Model Fair Value + Set as My Fair Value
- Current Market Price + Use in decision

Status banner stays explanatory (no SELL badge).

============================================================
5) DISPLAY OPTIMIZATION RULES
============================================================

- Judgment drivers get highest visual priority in the input area
- Anchors are compact and secondary
- Fair Value vs Price remains one of the strongest output signals
- Terminal Value is visible in titles/summary even when table collapsed
- Reduce duplicate AI text noise
- Keep light, calm, premium workbench style
- Dense where needed (bridge/table), airy around decisions/results

============================================================
6) COPY HELPERS TO INCLUDE
============================================================

Near drivers:
“FCF comes from Revenue × FCF Margin. WACC discounts FCFs and Terminal Value into EV.”

Near anchors:
“Cash and debt are not part of yearly FCF. They convert EV into equity value per share.”

Near collapsed forecast:
“Open to verify the year-by-year path behind EV.”

============================================================
EXPLICITLY FORBID
============================================================

- Default-expanded full 10-year table dominating the page
- Mixing anchors and drivers in one undifferentiated form
- Hiding Terminal Value only as an unlabeled grid cell
- Buy/Sell recommendation
- Treating Cash/Debt as FCF inputs
- Conflicting duplicate growth/discount fields

============================================================
OUTPUT
============================================================

Updated high-fidelity DCF Valuation layout showing:
1) Anchors vs Your drivers split
2) Collapsed 10-year forecast by default, with Terminal Value in the section title/summary
3) Clear EV bridge and Fair Value vs Price
4) Cleaner, progressive-disclosure workbench suitable for MyStockJournal