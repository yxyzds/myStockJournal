Design a high-fidelity Desktop Web Dashboard for MyStockJournal.

This is the first generation of the page. Design it complete and coherent from the start.

============================================================
PRODUCT
============================================================

MyStockJournal is a personal investment journal and decision workspace for value investors.

Formula:
- Core: record investment decisions
- Hook: AI Rate My Transaction
- Support: valuation + filings

Not a portfolio tracker, market terminal, brokerage watchlist, or valuation homepage.

User should feel:
“This is my investment notebook.”

Tagline:
Record decisions. Get rated. Stay honest.

============================================================
PAGE STRUCTURE (strict order)
============================================================

1. Header + Hero with ticker search
2. Recent Decisions
3. Needs your judgment (accordion)
4. Watch List

============================================================
1. HEADER + HERO
============================================================

Top nav:
- Left: My Journal
- Right: avatar “AM”
- Optional quiet global search is fine, but the hero ticker search is the main search

Hero:
- Brand title: MyStockJournal (hero-level)
- Tagline under brand
- Date: Tuesday, August 27, 2026

Directly under the date, place exactly one control:
- A large stock ticker search box
- Placeholder: “Search ticker — AAPL, NVDA, GOOGL…”
- Left search icon
- Purpose: jump to a stock workspace

Hero rules:
- No other elements under the date
- No Write decision / Update thesis / Open AI Review buttons
- No KPI cards
- No portfolio value / today’s change / total return
- No secondary CTA row

============================================================
2. RECENT DECISIONS
============================================================

Title: Recent Decisions
Right utility link: View all entries

This is the main subject of the dashboard.

Show three items:

1) Aug 27 · BUY · AAPL
   “Added — AI should accelerate the iPhone upgrade cycle.”
   Right side: prominent Score 78 control (clickable)

2) Aug 24 · THESIS UPDATE · NVDA
   “AI CapEx is slowing; reviewing my growth assumption.”
   Right side: Rate my decision

3) Aug 22 · BUY · NVDA
   “Bought the dip, but did I really test my thesis?”
   Right side: Score 62 (warning style)

Design notes:
- Compact decision rows/cards, easy to scan
- AI score is a clear product hook
- One-line rationale is enough on dashboard
- Do not expand full Why / Expected / Falsifier forms here

============================================================
3. NEEDS YOUR JUDGMENT
============================================================

Title: Needs your judgment
Subtitle: Open loops for you to decide.

Use accordion / collapsible style.

Collapsed row:
- color status mark
- title
- one-line teaser
- chevron
- dismiss ×

Expanded row:
- longer explanation
- why judgment is needed
- action link: Review DCF / Review thesis / Review decision

Show this state in the mock:
- First item expanded:
  Review NVDA growth assumption
  “AI CapEx slowed; your DCF still assumes 30% FCF growth.”
  Action: Review DCF
- Second collapsed: GOOGL 10-K filed
- Third collapsed: MSFT exit — outcome review

Tone: calm judgment inbox, not noisy alerts.

============================================================
4. WATCH LIST
============================================================

Title: Watch List
Subtitle: What you’re watching — health first.

This is a thesis/accountability monitor, not a price quote watchlist.

Each row includes:
- Ticker (strong, sharp, slightly technical)
- One-line thesis
- Core question
- Health status: Healthy / Weakening
- Last activity · Score

Rows:
- AAPL — Ecosystem moat · Services + AI upgrade cycle
  Can AI sustain the upgrade cycle? · Healthy · Aug 27 · Score 78
- GOOGL — Search durability · Cloud margins expanding
  Will AI disruption hit Search? · Healthy · Aug 18 · Score 79
- NVDA — AI compute platform · data-center demand
  Is CapEx growth durable? · Weakening · Aug 24 · Score 74

Rules:
- Health first
- No Price / Fair Value / Upside as primary columns
- Make it feel cooler and more “monitor-like” than a plain admin table
- Still clean and premium

============================================================
VISUAL STYLE
============================================================

Light, calm, premium
Notebook + critic aesthetic
Typography-led hierarchy
Generous whitespace
Semantic color only:
- blue = decision / info
- green = healthy / strong score
- amber = weakening / challenge / weak score

Avoid:
- purple AI glow
- crypto visuals
- trading-terminal density
- metric-card dashboard clichés

Desktop-first, mobile-convertible single column.

============================================================
OUTPUT
============================================================

One complete high-fidelity Desktop Dashboard with:
- hero ticker search only under the date
- Recent Decisions as the core
- accordion Needs your judgment
- Watch List as the bottom monitor