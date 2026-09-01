Design a high-fidelity Desktop Web page for MyStockJournal: Valuation.

This is the first generation of the page. Design it complete from the start.

============================================================
PRODUCT CONTEXT
============================================================

MyStockJournal formula:
- Core: record investment decisions
- Hook: AI Rate My Transaction
- Support: valuation + filings

Valuation is a stock-level TOOL.
It supports Journal / Transaction decisions.
It is NOT the product identity.

Entry flow into this page:
Transaction card → “Set valuation” / “Go to valuation” → Stock page → Valuation

User feeling:
“Assumptions are prefilled. I tune them. AI challenges aggressive inputs. I set My Fair Value and can use it in a decision.”

AI role here:
Financial modeler + assumption critic
NOT a tip engine. Never recommend Buy/Sell.

============================================================
PAGE PURPOSE
============================================================

On this page the user can:
1) Start from AI-prefilled assumptions
2) Edit assumptions and see Fair Value update live
3) Compare methods (DCF / Reverse DCF / P/E / EV/EBITDA / SOTP)
4) Inspect evidence behind assumptions (filings, history, guidance)
5) Receive AI Challenge when inputs are aggressive
6) Set My Fair Value (Preferred)
7) Return a selectable valuation to Transaction (“Valuation used”)

============================================================
TOP BAR
============================================================

- Back: AAPL · Stock
- Title: Apple Inc. · Valuation
- Method switcher:
  DCF | Reverse DCF | P/E | EV/EBITDA | SOTP
- Status chip when applicable: My Fair Value
- Actions:
  - Save
  - Set as My Fair Value
  - Use in decision

Do NOT put 10-K / 10-Q file chips in the title bar.

============================================================
LAYOUT (Desktop)
============================================================

3 zones:

LEFT (~38%): Assumptions (prefilled form)
CENTER (~40%): Outputs + sensitivity
RIGHT (~22%): AI Challenge + Evidence/Sources

Mobile later: Assumptions → Outputs → AI Challenge → Evidence

This is a modeling workbench, not an admin form dump and not a document manager.

============================================================
AI PREFILL / FIRST OPEN
============================================================

On first open (or “Reset to AI Base”), show:

AI Initial Valuation
- Bear: $185
- Base: $235 (default selected)
- Bull: $275

Helper text:
“AI generated this model from historical financials, recent filings, estimates, and market data.”

CTA: Use Base assumptions

Every key assumption field shows:
- Your input (editable)
- AI suggested (secondary)
Example:
Revenue CAGR
Your input: 10.0%
AI suggested: 7.8%

If user value diverges materially, show amber “differs from AI”.

============================================================
LEFT: ASSUMPTIONS
============================================================

Title: Assumptions
Subtext: Edit inputs — valuation updates live

DCF groups:
Growth
- Revenue Growth / CAGR
Profitability & reinvestment
- Operating Margin
- Tax Rate
- CapEx / Revenue
- NWC / Revenue (optional)
Discount & terminal
- WACC
- Terminal Growth
- Projection years

Under key fields: “Why this number?”
Clicking opens popover/drawer with:
- Historical data
- Analyst estimates
- Management guidance
- Filing excerpt
- Short AI reasoning

============================================================
CENTER: OUTPUTS
============================================================

Always visible results:
- Enterprise Value
- Equity Value
- Fair Value / Share (largest)
- Current Price
- Upside / Downside
- Margin of Safety

Scenario chips: Bear / Base / Bull

Below:
Sensitivity heatmap (WACC × Terminal Growth → Fair Value)

Compact strip:
This model $235 · My Fair Value $225 · Price $201
(If this model is My Fair Value, reflect that clearly.)

============================================================
RIGHT RAIL
============================================================

1) AI Challenge
Appears/intensifies on aggressive or inconsistent assumptions.
Example:
Aggressive assumption
Your 12% revenue CAGR is:
- Above 5Y historical CAGR
- Above analyst estimates
- Requires sustained share gains
Ask:
“What would need to happen for 12% to be realistic?”
List 2–4 drivers.
AI does not block input; it critiques.
No Buy/Sell advice.

2) Evidence / Sources
This is where filings live.
Title: Evidence
Subtext: Files support assumptions — not the page hero.

Compact list:
- 10-K FY2025 · cited in growth/margin
- 10-Q Q2 · CapEx commentary
- Earnings call · guidance

Actions:
- Add from filings
- Upload
- View excerpt

============================================================
MULTI-METHOD + MY FAIR VALUE
============================================================

Method tabs switch the body; keep the same page shell.

Model list / switcher examples for AAPL:
- DCF Base · $235
- P/E band · $225 · My Fair Value
- EV/EBITDA · $218
- SOTP · $247
- Reverse DCF · market implies 9.5% growth

Rules:
- One stock can have many models
- At most one My Fair Value
- “Set as My Fair Value” updates stock-level preferred value (Watch List column: My Fair Value)
- “Use in decision” attaches this model snapshot to Transaction → Valuation used
  Snapshot must keep method + FV + date so later My Fair Value changes do not rewrite history

============================================================
METHOD VARIANTS (SAME SHELL)
============================================================

Reverse DCF:
Hero: “What is the market pricing in?”
Show implied growth/margins from current price
Compare to Your Assumptions
Keep Evidence + AI Challenge

P/E & EV/EBITDA:
Current multiple vs 5Y / 10Y / peer median
Implied Fair Value
Same My Fair Value / Use in decision actions

SOTP:
Segment contribution rows → FV/share

============================================================
ARRIVAL STATES FROM TRANSACTION
============================================================

If user arrived via Transaction button:
- Show a top contextual banner:
  “Setting valuation for your AAPL decision”
  Secondary: “After saving, return to select it in Valuation used”
- If empty: emphasize Set as My Fair Value
- If editing existing: emphasize Save + Use in decision

============================================================
VISUAL STYLE
============================================================

Clean / premium / analytical / calm workbench
Closer to Linear/Stripe clarity than Bloomberg density
Light theme, neutral palette
Green for upside / My Fair Value active
Amber for AI warnings / divergences
Red only for clear downside
No crypto glow, no gamification, no valuation sidebar embedded inside Journal/Transaction pages

============================================================
EXPLICITLY FORBID
============================================================

- 10-K files dumped into the title bar
- Blank zeroed calculator with no AI prefill
- AI Buy/Sell recommendations
- Putting AI Rate My Transaction score UI on this page
- Making this page feel like the product homepage
- Editing valuation inside a Journal sidebar

============================================================
OUTPUT
============================================================

One high-fidelity Desktop Valuation mock (AAPL · DCF) showing:
- AI-prefilled assumptions vs user inputs
- Live FV outputs + sensitivity
- Right-rail AI Challenge + Evidence/filings
- Method switching
- Set as My Fair Value
- Use in decision / return-to-Transaction path clarity