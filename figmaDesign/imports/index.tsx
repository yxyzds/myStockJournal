import svgPaths from "./svg-ymm1ojrn1t";

function ArrowLeft() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="arrow-left">
      <svg className="absolute block inset-0 size-full" fill="none" height="16" preserveAspectRatio="none" viewBox="0 0 16 16" width="16">
        <g id="arrow-left">
          <path d={svgPaths.pe197860} id="Vector" stroke="#1E293B" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function IconContainer() {
  return (
    <div className="content-stretch flex flex-col items-center justify-center overflow-clip relative shrink-0 size-[16px]" data-name="icon-container">
      <ArrowLeft />
    </div>
  );
}

function BackButton() {
  return (
    <div className="bg-[#f4f6f9] content-stretch flex items-start p-[8px] relative rounded-[100px] shrink-0" data-name="back-button">
      <IconContainer />
    </div>
  );
}

function Separator() {
  return <div className="bg-[#ebf0f5] h-[16px] relative shrink-0 w-px" data-name="separator" />;
}

function TickerBadge() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-name="ticker-badge">
      <p className="[word-break:break-word] font-['Inter:Bold',sans-serif] font-bold leading-[normal] not-italic relative shrink-0 text-[#1e293b] text-[18px] whitespace-nowrap">AAPL</p>
      <Separator />
      <p className="[word-break:break-word] font-['Inter:Medium',sans-serif] font-medium leading-[normal] not-italic relative shrink-0 text-[#475569] text-[14px] whitespace-nowrap">Apple Inc.</p>
    </div>
  );
}

function HeaderLeft() {
  return (
    <div className="content-stretch flex gap-[16px] items-center relative shrink-0" data-name="header-left">
      <BackButton />
      <TickerBadge />
    </div>
  );
}

function EditButton() {
  return (
    <div className="bg-white content-stretch flex items-start px-[16px] py-[8px] relative rounded-[8px] shrink-0" data-name="edit-button">
      <div aria-hidden className="absolute border border-[#ebf0f5] border-solid inset-0 pointer-events-none rounded-[8px]" />
      <p className="[word-break:break-word] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[normal] not-italic relative shrink-0 text-[#1e293b] text-[13px] whitespace-nowrap">Edit</p>
    </div>
  );
}

function HeaderBar() {
  return (
    <div className="bg-white content-stretch flex h-[64px] items-center justify-between px-[24px] relative shrink-0 w-full" data-name="header-bar">
      <div aria-hidden className="absolute border-[#ebf0f5] border-b border-solid inset-0 pointer-events-none" />
      <HeaderLeft />
      <p className="[word-break:break-word] font-['Inter:Medium',sans-serif] font-medium leading-[normal] not-italic relative shrink-0 text-[#475569] text-[14px] whitespace-nowrap">Aug 27, 2026</p>
      <EditButton />
    </div>
  );
}

function ThoughtsHeader() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col font-['Inter:Bold',sans-serif] font-bold gap-[4px] items-start leading-[normal] not-italic relative shrink-0 w-full" data-name="thoughts-header">
      <p className="min-w-full relative shrink-0 text-[#1e293b] text-[18px] w-[min-content]">Thoughts on AAPL</p>
      <p className="relative shrink-0 text-[#8a99ad] text-[11px] tracking-[0.0055px] uppercase whitespace-nowrap">JOURNAL</p>
    </div>
  );
}

function ThoughtsParagraphs() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col font-['Inter:Regular',sans-serif] font-normal gap-[12px] items-start leading-[1.6] not-italic relative shrink-0 text-[#475569] text-[14px] w-full" data-name="thoughts-paragraphs">
      <p className="relative shrink-0 w-full">On-device intelligence should pull forward the iPhone upgrade cycle across the installed base. Services keeps compounding margins, and the developer ecosystem looks stickier than ever — this feels like a durable, multi-year refresh rather than a one-quarter bump.</p>
      <p className="relative shrink-0 w-full">{`I sized the position modestly because the AI upgrade thesis is still early. The indicator I'm watching is whether Services growth stalls, or the AI features fail to move upgrades. Revisiting after next earnings.`}</p>
    </div>
  );
}

function ThoughtsCard() {
  return (
    <div className="bg-white content-stretch flex flex-col gap-[16px] items-start p-[24px] relative rounded-[16px] shrink-0 w-full" data-name="thoughts-card">
      <div aria-hidden className="absolute border border-[#ebf0f5] border-solid inset-0 pointer-events-none rounded-[16px]" />
      <ThoughtsHeader />
      <ThoughtsParagraphs />
    </div>
  );
}

function MethodLeft() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0" data-name="method-left">
      <div className="relative shrink-0 size-[16px]" data-name="radio-unselected">
        <svg className="absolute block inset-0 size-full" fill="none" height="16" preserveAspectRatio="none" viewBox="0 0 16 16" width="16">
          <circle cx="8" cy="8" id="radio-unselected" r="7.25" stroke="#8A99AD" strokeWidth="1.5" />
        </svg>
      </div>
      <p className="[word-break:break-word] font-['Inter:Medium',sans-serif] font-medium leading-[normal] not-italic relative shrink-0 text-[#475569] text-[14px] whitespace-nowrap">DCF</p>
    </div>
  );
}

function MethodRight() {
  return (
    <div className="[word-break:break-word] content-stretch flex gap-[8px] items-center leading-[normal] not-italic relative shrink-0 whitespace-nowrap" data-name="method-right">
      <p className="font-['Inter:Bold',sans-serif] font-bold relative shrink-0 text-[#1e293b] text-[14px]">$235</p>
      <p className="font-['Inter:Regular',sans-serif] font-normal relative shrink-0 text-[#8a99ad] text-[12px]">Base case • Aug 12</p>
    </div>
  );
}

function RowDcf() {
  return (
    <div className="content-stretch flex items-center justify-between px-[16px] py-[12px] relative rounded-[8px] shrink-0 w-full" data-name="row-dcf">
      <MethodLeft />
      <MethodRight />
    </div>
  );
}

function RadioSelected() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="radio-selected">
      <svg className="absolute block inset-0 size-full" fill="none" height="16" preserveAspectRatio="none" viewBox="0 0 16 16" width="16">
        <g id="radio-selected">
          <rect height="14.5" rx="7.25" stroke="#2563EB" strokeWidth="1.5" width="14.5" x="0.75" y="0.75" />
          <circle cx="8" cy="8" fill="#2563EB" id="Ellipse" r="4" />
        </g>
      </svg>
    </div>
  );
}

function MethodLeft1() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0" data-name="method-left">
      <RadioSelected />
      <p className="[word-break:break-word] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[normal] not-italic relative shrink-0 text-[#2563eb] text-[14px] whitespace-nowrap">P/E band</p>
    </div>
  );
}

function MethodRight1() {
  return (
    <div className="[word-break:break-word] content-stretch flex gap-[8px] items-center leading-[normal] not-italic relative shrink-0 text-[#2563eb] whitespace-nowrap" data-name="method-right">
      <p className="font-['Inter:Bold',sans-serif] font-bold relative shrink-0 text-[14px]">$225</p>
      <p className="font-['Inter:Regular',sans-serif] font-normal opacity-70 relative shrink-0 text-[12px]">Preferred • Aug 20</p>
    </div>
  );
}

function RowPeBand() {
  return (
    <div className="bg-[#eff6ff] content-stretch flex items-center justify-between px-[16px] py-[12px] relative rounded-[8px] shrink-0 w-full" data-name="row-pe-band">
      <MethodLeft1 />
      <MethodRight1 />
    </div>
  );
}

function MethodLeft2() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0" data-name="method-left">
      <div className="relative shrink-0 size-[16px]" data-name="radio-unselected">
        <svg className="absolute block inset-0 size-full" fill="none" height="16" preserveAspectRatio="none" viewBox="0 0 16 16" width="16">
          <circle cx="8" cy="8" id="radio-unselected" r="7.25" stroke="#8A99AD" strokeWidth="1.5" />
        </svg>
      </div>
      <p className="[word-break:break-word] font-['Inter:Medium',sans-serif] font-medium leading-[normal] not-italic relative shrink-0 text-[#475569] text-[14px] whitespace-nowrap">EV/EBITDA</p>
    </div>
  );
}

function MethodRight2() {
  return (
    <div className="content-stretch flex items-center relative shrink-0" data-name="method-right">
      <p className="[word-break:break-word] font-['Inter:Bold',sans-serif] font-bold leading-[normal] not-italic relative shrink-0 text-[#1e293b] text-[14px] whitespace-nowrap">$210</p>
    </div>
  );
}

function RowEvEbitda() {
  return (
    <div className="content-stretch flex items-center justify-between px-[16px] py-[12px] relative rounded-[8px] shrink-0 w-full" data-name="row-ev-ebitda">
      <MethodLeft2 />
      <MethodRight2 />
    </div>
  );
}

function MethodLeft3() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0" data-name="method-left">
      <div className="relative shrink-0 size-[16px]" data-name="radio-unselected">
        <svg className="absolute block inset-0 size-full" fill="none" height="16" preserveAspectRatio="none" viewBox="0 0 16 16" width="16">
          <circle cx="8" cy="8" id="radio-unselected" r="7.25" stroke="#8A99AD" strokeWidth="1.5" />
        </svg>
      </div>
      <p className="[word-break:break-word] font-['Inter:Medium',sans-serif] font-medium leading-[normal] not-italic relative shrink-0 text-[#475569] text-[14px] whitespace-nowrap">SOTP</p>
    </div>
  );
}

function MethodRight3() {
  return (
    <div className="content-stretch flex items-center relative shrink-0" data-name="method-right">
      <p className="[word-break:break-word] font-['Inter:Bold',sans-serif] font-bold leading-[normal] not-italic relative shrink-0 text-[#1e293b] text-[14px] whitespace-nowrap">$247</p>
    </div>
  );
}

function RowSotp() {
  return (
    <div className="content-stretch flex items-center justify-between px-[16px] py-[12px] relative rounded-[8px] shrink-0 w-full" data-name="row-sotp">
      <MethodLeft3 />
      <MethodRight3 />
    </div>
  );
}

function MethodLeft4() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0" data-name="method-left">
      <div className="relative shrink-0 size-[16px]" data-name="radio-unselected">
        <svg className="absolute block inset-0 size-full" fill="none" height="16" preserveAspectRatio="none" viewBox="0 0 16 16" width="16">
          <circle cx="8" cy="8" id="radio-unselected" r="7.25" stroke="#8A99AD" strokeWidth="1.5" />
        </svg>
      </div>
      <p className="[word-break:break-word] font-['Inter:Medium',sans-serif] font-medium leading-[normal] not-italic relative shrink-0 text-[#475569] text-[14px] whitespace-nowrap">Reverse DCF</p>
    </div>
  );
}

function MethodRight4() {
  return (
    <div className="content-stretch flex items-center relative shrink-0" data-name="method-right">
      <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[#8a99ad] text-[12px] whitespace-nowrap">market implies 9.5% growth</p>
    </div>
  );
}

function RowReverseDcf() {
  return (
    <div className="content-stretch flex items-center justify-between px-[16px] py-[12px] relative rounded-[8px] shrink-0 w-full" data-name="row-reverse-dcf">
      <MethodLeft4 />
      <MethodRight4 />
    </div>
  );
}

function ValuationMethodsList() {
  return (
    <div className="content-stretch flex flex-col gap-[4px] items-start relative shrink-0 w-full" data-name="valuation-methods-list">
      <RowDcf />
      <RowPeBand />
      <RowEvEbitda />
      <RowSotp />
      <RowReverseDcf />
    </div>
  );
}

function ReferenceCard() {
  return (
    <div className="bg-white content-stretch flex flex-col gap-[16px] items-start p-[24px] relative rounded-[16px] shrink-0 w-full" data-name="reference-card">
      <div aria-hidden className="absolute border border-[#ebf0f5] border-solid inset-0 pointer-events-none rounded-[16px]" />
      <p className="[word-break:break-word] font-['Inter:Bold',sans-serif] font-bold leading-[normal] not-italic relative shrink-0 text-[#1e293b] text-[16px] w-full">Transaction reference</p>
      <ValuationMethodsList />
    </div>
  );
}

function TransCardHeader() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col gap-[4px] items-center leading-[normal] not-italic relative shrink-0 whitespace-nowrap" data-name="trans-card-header">
      <p className="font-['Inter:Bold',sans-serif] font-bold relative shrink-0 text-[#1e293b] text-[18px]">Transaction</p>
      <p className="font-['Inter:Regular',sans-serif] font-normal relative shrink-0 text-[#475569] text-[12px]">Transaction attached to this entry</p>
    </div>
  );
}

function BuyBadgeActive() {
  return (
    <div className="bg-[#def7ec] content-stretch flex items-center px-[16px] py-[8px] relative rounded-[8px] shrink-0" data-name="buy-badge-active">
      <p className="[word-break:break-word] font-['Inter:Bold',sans-serif] font-bold leading-[normal] not-italic relative shrink-0 text-[#03543f] text-[13px] whitespace-nowrap">+ Buy</p>
    </div>
  );
}

function SellBadge() {
  return (
    <div className="bg-[#fde8e8] content-stretch flex items-center opacity-60 px-[16px] py-[8px] relative rounded-[8px] shrink-0" data-name="sell-badge">
      <p className="[word-break:break-word] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[normal] not-italic relative shrink-0 text-[#9b1c1c] text-[13px] whitespace-nowrap">- Sell</p>
    </div>
  );
}

function BuySellToggle() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0" data-name="buy-sell-toggle">
      <BuyBadgeActive />
      <SellBadge />
    </div>
  );
}

function CapsuleBuy() {
  return (
    <div className="bg-[#eff6ff] content-stretch flex items-start px-[10px] py-[4px] relative rounded-[100px] shrink-0" data-name="capsule-buy">
      <p className="[word-break:break-word] font-['Inter:Bold',sans-serif] font-bold leading-[normal] not-italic relative shrink-0 text-[#2563eb] text-[10px] uppercase whitespace-nowrap">TRANSACTION • BUY</p>
    </div>
  );
}

function CapsuleRef() {
  return (
    <div className="bg-[#f4f6f9] content-stretch flex items-start px-[10px] py-[4px] relative rounded-[100px] shrink-0" data-name="capsule-ref">
      <p className="[word-break:break-word] font-['Inter:Bold',sans-serif] font-bold leading-[normal] not-italic relative shrink-0 text-[#475569] text-[10px] uppercase whitespace-nowrap">REF: P/E BAND ($225)</p>
    </div>
  );
}

function CapsulesRow() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-name="capsules-row">
      <CapsuleBuy />
      <CapsuleRef />
    </div>
  );
}

function MetricPrice() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col font-['Inter:Bold',sans-serif] font-bold gap-[4px] items-start leading-[normal] not-italic relative shrink-0 w-[180px] whitespace-nowrap" data-name="metric-price">
      <p className="relative shrink-0 text-[#8a99ad] text-[11px] uppercase">PRICE</p>
      <p className="relative shrink-0 text-[#1e293b] text-[16px]">$201.32</p>
    </div>
  );
}

function MetricQty() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col font-['Inter:Bold',sans-serif] font-bold gap-[4px] items-start leading-[normal] not-italic relative shrink-0 w-[180px] whitespace-nowrap" data-name="metric-qty">
      <p className="relative shrink-0 text-[#8a99ad] text-[11px] uppercase">QUANTITY</p>
      <p className="relative shrink-0 text-[#1e293b] text-[16px]">25 shares</p>
    </div>
  );
}

function MetricDate() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col font-['Inter:Bold',sans-serif] font-bold gap-[4px] items-start leading-[normal] not-italic relative shrink-0 w-[180px] whitespace-nowrap" data-name="metric-date">
      <p className="relative shrink-0 text-[#8a99ad] text-[11px] uppercase">DATE</p>
      <p className="relative shrink-0 text-[#1e293b] text-[16px]">Aug 27, 2026</p>
    </div>
  );
}

function InfoMetrics() {
  return (
    <div className="content-stretch flex items-center justify-between pt-[16px] relative shrink-0 w-full" data-name="info-metrics">
      <div aria-hidden className="absolute border-[#ebf0f5] border-solid border-t inset-0 pointer-events-none" />
      <MetricPrice />
      <MetricQty />
      <MetricDate />
    </div>
  );
}

function TransactionCard() {
  return (
    <div className="bg-white content-stretch flex flex-col gap-[24px] items-center p-[24px] relative rounded-[16px] shrink-0 w-full" data-name="transaction-card">
      <div aria-hidden className="absolute border border-[#ebf0f5] border-solid inset-0 pointer-events-none rounded-[16px]" />
      <TransCardHeader />
      <BuySellToggle />
      <CapsulesRow />
      <InfoMetrics />
    </div>
  );
}

function LeftColumn() {
  return (
    <div className="content-stretch flex flex-col gap-[24px] items-start relative shrink-0 w-[680px]" data-name="left-column">
      <ThoughtsCard />
      <ReferenceCard />
      <TransactionCard />
    </div>
  );
}

function Award() {
  return (
    <div className="relative shrink-0 size-[14px]" data-name="award">
      <svg className="absolute block inset-0 size-full" fill="none" height="14" preserveAspectRatio="none" viewBox="0 0 14 14" width="14">
        <g id="award">
          <path d={svgPaths.p3c35c300} id="Vector" stroke="#2563EB" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function IconContainer1() {
  return (
    <div className="content-stretch flex flex-col items-center justify-center overflow-clip relative shrink-0 size-[14px]" data-name="icon-container">
      <Award />
    </div>
  );
}

function ScoringTop() {
  return (
    <div className="content-stretch flex gap-[6px] items-center relative shrink-0" data-name="scoring-top">
      <IconContainer1 />
      <p className="[word-break:break-word] font-['Inter:Bold',sans-serif] font-bold leading-[normal] not-italic relative shrink-0 text-[#2563eb] text-[12px] whitespace-nowrap">Rate My Transaction</p>
    </div>
  );
}

function ScoreDisplay() {
  return (
    <div className="[word-break:break-word] content-stretch flex gap-[4px] items-baseline leading-[normal] not-italic relative shrink-0 whitespace-nowrap" data-name="score-display">
      <p className="font-['Inter:Extra_Bold',sans-serif] font-extrabold relative shrink-0 text-[#1e293b] text-[56px]">78</p>
      <p className="font-['Inter:Medium',sans-serif] font-medium relative shrink-0 text-[#8a99ad] text-[20px]">/ 100</p>
    </div>
  );
}

function BreakdownRow() {
  return (
    <div className="[word-break:break-word] content-stretch flex items-center justify-between leading-[normal] not-italic relative shrink-0 text-[13px] w-full whitespace-nowrap" data-name="breakdown-row">
      <p className="font-['Inter:Regular',sans-serif] font-normal relative shrink-0 text-[#475569]">Valuation</p>
      <p className="font-['Inter:Bold',sans-serif] font-bold relative shrink-0 text-[#1e293b]">86</p>
    </div>
  );
}

function BreakdownRow1() {
  return (
    <div className="[word-break:break-word] content-stretch flex items-center justify-between leading-[normal] not-italic relative shrink-0 text-[13px] w-full whitespace-nowrap" data-name="breakdown-row">
      <p className="font-['Inter:Regular',sans-serif] font-normal relative shrink-0 text-[#475569]">Thesis Alignment</p>
      <p className="font-['Inter:Bold',sans-serif] font-bold relative shrink-0 text-[#1e293b]">81</p>
    </div>
  );
}

function WarningPill() {
  return (
    <div className="bg-[#b45309] content-stretch flex items-start px-[8px] py-[2px] relative rounded-[4px] shrink-0" data-name="warning-pill">
      <p className="[word-break:break-word] font-['Inter:Bold',sans-serif] font-bold leading-[normal] not-italic relative shrink-0 text-[11px] text-white whitespace-nowrap">50</p>
    </div>
  );
}

function BreakdownRow2() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="breakdown-row">
      <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[#475569] text-[13px] whitespace-nowrap">Evidence</p>
      <WarningPill />
    </div>
  );
}

function BreakdownRow3() {
  return (
    <div className="[word-break:break-word] content-stretch flex items-center justify-between leading-[normal] not-italic relative shrink-0 text-[13px] w-full whitespace-nowrap" data-name="breakdown-row">
      <p className="font-['Inter:Regular',sans-serif] font-normal relative shrink-0 text-[#475569]">Risk Management</p>
      <p className="font-['Inter:Bold',sans-serif] font-bold relative shrink-0 text-[#1e293b]">73</p>
    </div>
  );
}

function BreakdownList() {
  return (
    <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full" data-name="breakdown-list">
      <BreakdownRow />
      <BreakdownRow1 />
      <BreakdownRow2 />
      <BreakdownRow3 />
    </div>
  );
}

function BreakdownContainer() {
  return (
    <div className="content-stretch flex flex-col gap-[12px] items-start relative shrink-0 w-full" data-name="breakdown-container">
      <p className="[word-break:break-word] font-['Inter:Bold',sans-serif] font-bold leading-[normal] not-italic relative shrink-0 text-[#8a99ad] text-[10px] tracking-[0.005px] uppercase whitespace-nowrap">BREAKDOWN</p>
      <BreakdownList />
    </div>
  );
}

function ChallengeAlertBox() {
  return (
    <div className="bg-[#fffbeb] content-stretch flex flex-col gap-[8px] items-start p-[16px] relative rounded-[12px] shrink-0 w-full" data-name="challenge-alert-box">
      <div aria-hidden className="absolute border border-[#fde68a] border-solid inset-0 pointer-events-none rounded-[12px]" />
      <p className="[word-break:break-word] font-['Inter:Extra_Bold',sans-serif] font-extrabold leading-[normal] not-italic relative shrink-0 text-[#b45309] text-[10px] tracking-[0.005px] uppercase whitespace-nowrap">AI CHALLENGE</p>
      <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[1.5] min-w-full not-italic relative shrink-0 text-[#b45309] text-[13px] w-[min-content]">Your growth assumption sits above the 5Y average. What evidence would justify it?</p>
    </div>
  );
}

function CtaRateButton() {
  return (
    <div className="bg-[#2563eb] content-stretch drop-shadow-[0px_8px_8px_rgba(37,99,235,0.25)] flex flex-col items-center justify-center relative rounded-[100px] shrink-0 size-[100px]" data-name="cta-rate-button">
      <p className="[word-break:break-word] font-['Inter:Bold',sans-serif] font-bold leading-[normal] not-italic relative shrink-0 text-[15px] text-white whitespace-nowrap">Rate</p>
    </div>
  );
}

function ScoringCard() {
  return (
    <div className="bg-white content-stretch flex flex-col gap-[24px] items-center p-[24px] relative rounded-[16px] shrink-0 w-full" data-name="scoring-card">
      <div aria-hidden className="absolute border border-[#ebf0f5] border-solid inset-0 pointer-events-none rounded-[16px]" />
      <ScoringTop />
      <ScoreDisplay />
      <p className="[word-break:break-word] font-['Inter:Medium',sans-serif] font-medium leading-[normal] min-w-full not-italic relative shrink-0 text-[#475569] text-[13px] text-center w-[min-content]">Strong reasoning, one mild gap in evidence.</p>
      <BreakdownContainer />
      <ChallengeAlertBox />
      <CtaRateButton />
      <p className="[word-break:break-word] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[normal] min-w-full not-italic relative shrink-0 text-[#2563eb] text-[12px] text-center w-[min-content]">What would change this score?</p>
    </div>
  );
}

function RightColumn() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-[348px]" data-name="right-column">
      <ScoringCard />
    </div>
  );
}

function ContentContainer() {
  return (
    <div className="content-stretch flex gap-[24px] items-start pt-[24px] px-[24px] relative shrink-0 w-full" data-name="content-container">
      <LeftColumn />
      <RightColumn />
    </div>
  );
}

export default function AaplTransactionPage() {
  return (
    <div className="bg-[#f4f6f9] content-stretch flex flex-col items-start pb-[48px] relative size-full" data-name="aapl-transaction-page">
      <HeaderBar />
      <ContentContainer />
    </div>
  );
}