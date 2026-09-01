import { useRouter } from "../router";

export default function ValuationPlaceholder() {
  const { back } = useRouter();
  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col">
      <nav className="bg-white border-b border-[#ebf0f5] px-8 py-4 flex items-center gap-4">
        <button
          onClick={back}
          className="flex items-center gap-2 text-[#475569] hover:text-[#1e293b] transition-colors border-0 bg-transparent cursor-pointer p-0"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span style={{ fontFamily: "'Inter', sans-serif" }} className="text-[14px] font-medium">
            Back
          </span>
        </button>
        <span className="text-[#cbd5e1] select-none">/</span>
        <span
          style={{ fontFamily: "'Inter', sans-serif" }}
          className="text-[14px] font-semibold text-[#1e293b]"
        >
          AAPL — Valuation
        </span>
      </nav>

      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-8">
        <div className="w-12 h-12 rounded-full bg-[#eff6ff] flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M12 3v18M3 12h18" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        <h1
          style={{ fontFamily: "'Playfair Display', serif" }}
          className="text-[28px] font-bold text-[#1e293b]"
        >
          Valuation
        </h1>
        <p
          style={{ fontFamily: "'Inter', sans-serif" }}
          className="text-[14px] text-[#64748b] max-w-[360px]"
        >
          This page is coming soon. You'll be able to set and manage valuation models for AAPL here.
        </p>
      </div>
    </div>
  );
}
