Design a high-fidelity Desktop Web page for MyStockJournal: Valuation (DCF).

This is the first generation of the page. Preserve the interaction style of a clean spreadsheet-like DCF workbench the user likes, but present it as a modern web app (not raw Google Sheets chrome).

============================================================
PRODUCT CONTEXT
============================================================

MyStockJournal formula:
- Core: record investment decisions
- Hook: AI Rate My Transaction
- Support: valuation + filings

Valuation is a stock-level tool reached via:
Transaction → “Set valuation” / “Go to valuation” → Stock → Valuation

AI role:
- Prefill assumptions
- Challenge aggressive inputs
- Never output Buy/Sell recommendations

User feeling:
“I edit a few drivers, see the FCF forecast and the EV → Equity → Fair Value bridge update live.”

============================================================
INTERACTION TEMPLATE TO EMULATE
============================================================

Follow this proven 3-block structure from the user’s DCF sheet:

1) TOP: Assumptions / drivers (editable)
2) MIDDLE: Year-by-year projection table (FCF, terminal value, margins)
3) BOTTOM: Valuation bridge + Fair Value vs Market Price summary cards

Keep the mental model of a spreadsheet DCF, but with better hierarchy, spacing, and web controls.

============================================================
TOP BAR
============================================================

- Back: AAPL · Stock  (example ticker can be DDOG or AAPL; use one consistently)
- Title: {Ticker} · Valuation · DCF
- Method switcher: DCF | Reverse DCF | P/E | EV/EBITDA | SOTP
- Status chip: My Fair Value (if this model is preferred)
- Actions: Save · Set as My Fair Value · Use in decision

No filings dumped in the title bar.

============================================================
BLOCK 1 — ASSUMPTIONS (TOP)
============================================================

Title: Assumptions
Subtext: Edit drivers — forecast and fair value update live

IMPORTANT: Use ONE clean driver set (do not duplicate conflicting growth fields).

Required editable drivers:
- Revenue growth Y1–5 (%)
- Revenue growth Y6–10 (%)
- Terminal growth rate (%)
- WACC / discount rate (%)   ← single discount rate only
- TTM Revenue
- FCF margin Y1 (%)
- FCF margin fade-to / terminal FCF margin (%)  (or explicit yearly margin path)
- Net cash / cash & investments (for bridge)
- Total debt (for bridge)
- Diluted shares outstanding

Reference-only (NOT used in calculation, shown as context):
- Past 5-year revenue growth

Each key driver shows:
- Your input
- AI suggested (secondary)
- “Why this number?”

Do NOT show both “future growth 20%” and “revenue growth 25%” as parallel conflicting drivers.
Do NOT show a second discount rate (no separate “expected discount rate” in v1).

Optional AI Initial Valuation strip above drivers:
- Bear / Base / Bull fair value chips from AI prefill
- Helper: generated from historicals, filings, estimates
- CTA: Use Base assumptions

============================================================
BLOCK 2 — PROJECTION TABLE (MIDDLE)
============================================================

Horizontal year columns, e.g. 2026 → 2035/2036 (10–11 years).

Rows (must include):
- Revenue (optional but preferred)
- Free Cash Flow (FCF)
- FCF Margin (%)
- Terminal Value (only on final year)
- Total (final year = FCF + Terminal Value)

Interaction:
- Values update live when assumptions change
- Make the final-year Terminal Value visually distinct
- Keep readable density; spreadsheet clarity without Excel clutter

Show units clearly (e.g. $ in millions) in a single place.

============================================================
BLOCK 3 — VALUATION BRIDGE + SUMMARY (BOTTOM)
============================================================

Left: Valuation bridge (exact logic, labels in English UI; Chinese annotations optional)

Must show this chain correctly:

1) Enterprise Value (EV)
   = PV of projected FCFs + PV of Terminal Value
   (all discounted at WACC)

2) (+) Cash & other investments

3) (−) Total debt

4) Equity Value
   = EV + Cash − Debt

5) Shares outstanding (diluted)

6) My model Fair Value / share
   = Equity Value / Shares

7) Current market price

8) Margin of Safety / Upside
   = (Fair Value − Price) / Price
   (show negative clearly if overvalued)

Right/center summary cards (like the sheet’s highlight cards):
- Fair Value card (large): $218.10
- Market Price card (large): $248.00
- MOS / Upside chip: -12.1%

CRITICAL PRODUCT RULE:
- Do NOT show Buy / Sell / Hold recommendation
- Replace recommendation with neutral decision support:
  “Price is 12% above your fair value” / “Margin of safety: -12%”

Actions near summary:
- Set as My Fair Value
- Use in decision (returns this model snapshot to Transaction → Valuation used)

============================================================
CORRECT SAMPLE DATA (FOR MOCK CONSISTENCY)
============================================================

You may use a worked example similar to the user’s sheet, but keep math internally consistent with ONE discount rate.

Example labeling (illustrative; keep bridge identity clear):
- Ticker: DDOG
- TTM Revenue: 3,966.7
- Growth Y1–5 / Y6–10 / Terminal: coherent single set
- WACC: 9.00%
- Projection table with yearly FCF + final Terminal Value
- EV
- + Cash
- − Debt
- Equity Value
- Shares
- Fair Value / share
- Market Price
- MOS

All derived numbers must reconcile:
Equity Value = EV + Cash − Debt
Fair Value/share = Equity Value / Shares
MOS = (FV − Price) / Price

If you show Terminal Value, it must use the same WACC as EV discounting:
TV = FCF_final × (1 + g) / (WACC − g)
Then discount TV and FCFs at WACC into EV.

============================================================
RIGHT SUPPORT (OPTIONAL SLIM RAIL OR BOTTOM SECTION)
============================================================

AI Challenge:
- Appears when growth/margin/WACC diverge aggressively from history/AI suggested
- Critiques assumptions only
- No trade recommendation

Evidence:
- Linked filings / excerpts supporting drivers
- Not in title bar

============================================================
VISUAL STYLE
============================================================

Modern SaaS workbench inspired by the clarity of the spreadsheet template:
- Clear input cluster
- Dense but readable projection grid
- Strong bottom bridge + two big comparison cards (Fair Value vs Market Price)
- Light theme, calm, premium, analytical
- Green for fair-value emphasis / positive MOS
- Red/amber for negative MOS or warnings
- No crypto glow, no fake “SELL” banners

============================================================
EXPLICITLY FORBID
============================================================

- Assumptions-only page without EV bridge
- Conflicting duplicate growth inputs
- Two discount rates driving different parts of the model
- System Buy/Sell recommendation
- Putting AI Rate My Transaction score on this page
- Filings occupying the header
- Blank calculator with no prefill

============================================================
OUTPUT
============================================================

One high-fidelity Desktop DCF Valuation page that clearly shows:
1) Clean editable assumptions
2) Multi-year FCF projection + terminal value
3) Correct EV → Cash/Debt → Equity → Shares → Fair Value bridge
4) Fair Value vs Market Price cards + MOS
5) Set as My Fair Value / Use in decision
6) No Buy/Sell recommendation