Design a high-fidelity Desktop Web page for MyStockJournal: Valuation · P/E (with PEG chart toggle).

This is the first generation of the page. Keep it consistent with MyStockJournal:
- Core: record investment decisions
- Hook: AI Rate My Transaction
- Support: valuation tools
Valuation is reached via Stock → Valuation. AI assists; never gives Buy/Sell advice.

============================================================
PAGE PURPOSE
============================================================

Help the user choose an Expected P/E through comparison, then compute Fair Value.

Primary formula:
Fair Value = Expected P/E × EPS

PEG is a companion lens (growth-adjusted), switched via chart toggle — not a separate product tab.

============================================================
TOP BAR
============================================================

- Back: {Ticker} · Stock
- Title: {Ticker} · Valuation
- Method tabs: DCF | P/E | Reverse DCF | EV/EBITDA | SOTP
  (P/E selected; subtitle can read “P/E · PEG”)
- Actions: Save · Set as My Fair Value · Use in decision

============================================================
HERO / QUOTE (IMPORTANT)
============================================================

Near the top of the content (under title or above the chart), place a short market-wisdom excerpt emphasizing that P/E only means something in comparison.

Use this copy (Chinese UI OK; bilingual OK):

“市盈率单独看没有意义；只有和自身历史、同业与成长性对比时，才有参考价值。”
— 改编自《股市真规则》的估值比较思想

English alternate acceptable:
“A P/E ratio means little in isolation — it becomes useful only when compared with a company’s history, peers, and growth.”
— inspired by The Five Rules for Successful Stock Investing (《股市真规则》)

Style: quiet pull-quote / editorial note, not a giant banner. Calm, trustworthy.

============================================================
MAIN LAYOUT
============================================================

Left / main (~65–70%):
1) Chart switch + 10-year comparison line chart (PAGE HERO VISUAL)
2) Peer controls (AI suggest + user-added peers appear on chart)

Right (~30–35%):
3) Expected P/E input (primary judgment)
4) EPS anchor + Fair Value output
5) PEG helper metrics (compact)
6) Actions: Set as My Fair Value / Use in decision

============================================================
1) CHART TOGGLE + 10-YEAR LINE CHART (CORE)
============================================================

Segmented control above chart:
[ P/E ]  [ PEG ]

---------------- P/E mode ----------------
Line chart over ~10 years:
- Company historical P/E line (main)
- Optional band/percentile if available
- Horizontal reference lines or secondary series for:
  - 5Y average P/E
  - 10Y average P/E
  - Current P/E marker
  - Your Expected P/E (strong distinct line/marker)
- After peers are added: each peer’s current P/E as markers or small comparison dots/lines in a legend
  (If full 10y peer history is unavailable, show peer current P/E as comparison marks + legend; do not fake history)

---------------- PEG mode ----------------
Same time interaction, switch series to PEG:
- Company historical PEG line (~10y)
- Reference: PEG = 1 guide line
- Peer PEG comparison marks/median after peers added
- PEG at your Expected P/E (highlight)
Requires Expected growth input (see right rail)

Chart requirements:
- Clean, premium, readable — not terminal-dense
- Legend clear
- Empty/loading/error states
- Title examples:
  - “10-Year P/E vs references”
  - “10-Year PEG vs peers & growth”

============================================================
2) AI PEER COMPANIES
============================================================

Section under/near chart:
Peers for comparison

- Button: Suggest peers (AI)
- AI returns 5–8 tickers with one-line why (business similarity / growth / scale)
- User can:
  - Add / remove peers
  - Manually add ticker
- Added peers immediately appear in chart comparison + peer stats

Show peer summary chips/table (compact):
- Ticker
- Current P/E (or NM if loss-making)
- PEG (if available)
- Peer median P/E
- Peer median PEG

Rules:
- Validate tickers against real data; no hallucinated symbols in final UI state
- Exclude or mark non-meaningful P/E (negative earnings)
- AI suggests; user confirms. Never auto-lock peers without review
- Prefer “Peer median” language over vague “Industry P/E”

Quick actions:
- Use peer median P/E → fills Expected P/E
- Use 5Y avg P/E → fills Expected P/E
- Use current P/E → fills Expected P/E

============================================================
3) EXPECTED P/E → FAIR VALUE (PRIMARY CONTROL)
============================================================

Right rail primary block:

Expected P/E
- Large numeric input (user-editable)
- Helper: “Your judgment multiple”

EPS
- Show selected EPS basis clearly:
  Toggle or label: TTM EPS | Forward EPS
- Prefetched anchor value
- Fair Value formula reminder: Expected P/E × EPS

Outputs:
- Fair Value / share (large)
- Current Price
- Upside / Margin of Safety
- Neutral status text only (NO Buy/Sell)

Example:
Expected P/E 24.0x
Forward EPS $9.38
Fair Value $225.12
Price $201 → +12.0%

============================================================
4) PEG COMPANION CONTROLS
============================================================

When chart is on PEG (and still visible as compact metrics always):
- Expected earnings growth (%; AI prefill, editable)
- Current PEG
- PEG at your Expected P/E
- Optional: Suggest Expected P/E from target PEG (e.g. PEG=1)
  Implied P/E ≈ target PEG × growth

Do not replace Expected P/E as the main FV driver.
PEG is comparison + sanity check + optional suggestion.

============================================================
5) DATA / STATES
============================================================

Include:
- Default state with 10y P/E chart + empty peers + Expected P/E ready
- After AI suggest peers (selection UI)
- After peers added (chart updated + median shown)
- PEG toggle state
- Missing EPS / NM P/E warnings
- Growth <= 0 → PEG unavailable message

============================================================
VISUAL STYLE
============================================================

Clean / premium / analytical / calm
Same family as DCF Valuation page
Light theme
Chart is the visual center
Quote is subtle and editorial
Green/amber only for MOS and warnings
No crypto glow, no trade-recommendation badges

============================================================
EXPLICITLY FORBID
============================================================

- Showing only a single isolated current P/E with no comparison
- Separate heavy PEG-only page in v1
- Auto Buy/Sell advice from P/E or PEG
- Fake peer 10y history if data isn’t available
- Calling peer median “the correct industry fair P/E” as absolute truth
- Making Expected P/E secondary to chart chrome

============================================================
OUTPUT
============================================================

One high-fidelity Desktop mock for {Ticker} P/E Valuation page featuring:
1) Wisdom quote on P/E comparison
2) P/E | PEG chart toggle with ~10-year line chart as main visual
3) AI peer suggest → user add → peers appear in chart/compare
4) Expected P/E input → Fair Value vs Price
5) Set as My Fair Value / Use in decision