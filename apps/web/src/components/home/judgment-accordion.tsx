"use client";

import { useState } from "react";
import { JUDGMENT_ITEMS } from "@/lib/mock-journal";

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
      aria-hidden
    >
      <path d="M4 6L8 10L12 6" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function JudgmentAccordion() {
  const [openId, setOpenId] = useState<number | null>(1);
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());
  const visible = JUDGMENT_ITEMS.filter((item) => !dismissed.has(item.id));

  return (
    <section className="w-full border-y border-slate-100 bg-slate-50 py-8 md:py-12">
      <div className="mx-auto max-w-[1080px] px-4 md:px-8">
        <div className="mb-4 md:mb-6">
          <h2 className="font-heading text-[20px] font-bold text-slate-900 md:text-2xl">Needs your judgment</h2>
          <p className="mt-1 text-[12px] text-slate-400 md:text-[13px]">Open loops for you to decide.</p>
        </div>
        <div className="flex flex-col gap-1.5 md:gap-0.5">
          {visible.map((item) => {
            const isOpen = openId === item.id;
            return (
              <div key={item.id} className="overflow-hidden rounded-xl border border-slate-100 bg-white md:rounded-[10px]">
                <div
                  className="flex cursor-pointer items-center gap-3 px-4 py-3.5 select-none md:gap-4 md:px-5 md:py-4"
                  onClick={() => setOpenId(isOpen ? null : item.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setOpenId(isOpen ? null : item.id);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div className={`size-2 shrink-0 rounded-full ${item.dotColor}`} />
                  <div className="min-w-0 flex-1">
                    <span className="block text-[13px] leading-snug font-semibold text-slate-800 md:text-[14px]">
                      {item.title}
                    </span>
                    {!isOpen && (
                      <span className="mt-0.5 block truncate text-[12px] text-slate-400 md:text-[13px]">
                        {item.teaser}
                      </span>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <ChevronIcon open={isOpen} />
                    <button
                      type="button"
                      aria-label="Dismiss"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDismissed((prev) => new Set([...prev, item.id]));
                        if (openId === item.id) setOpenId(null);
                      }}
                      className="p-1 text-slate-300 hover:text-slate-500"
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M2 2L12 12M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>
                </div>
                {isOpen && (
                  <div className="border-t border-slate-100 px-4 pb-4 md:px-5 md:pb-5">
                    <p className="mt-3 mb-4 text-[12px] leading-[1.65] text-slate-500 md:mt-4 md:mb-5 md:text-[13px]">
                      {item.detail || item.teaser}
                    </p>
                    <button
                      type="button"
                      className="inline-flex rounded-lg border border-blue-200 px-4 py-2 text-[12px] font-semibold text-blue-600 hover:bg-blue-50 md:rounded-md md:py-1.5 md:text-[13px]"
                    >
                      {item.actionLabel} →
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
