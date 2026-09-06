"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { JudgmentItem } from "@mystockjournal/shared";
import { api } from "@/lib/api";

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

function dotClass(form: string) {
  return form === "10-K" ? "bg-blue-400" : "bg-amber-400";
}

export function JudgmentAccordion() {
  const queryClient = useQueryClient();
  const [openId, setOpenId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["judgment"],
    queryFn: () => api<{ items: JudgmentItem[] }>("/judgment"),
  });
  const items = query.data?.items ?? [];

  const dismiss = useMutation({
    mutationFn: (id: string) => api(`/judgment/${id}/dismiss`, { method: "POST" }),
    onSuccess: async (_data, id) => {
      if (openId === id) setOpenId(null);
      await queryClient.invalidateQueries({ queryKey: ["judgment"] });
    },
  });

  return (
    <section className="w-full border-y border-slate-100 bg-slate-50 py-8 md:py-12">
      <div className="mx-auto max-w-[1080px] px-4 md:px-8">
        <div className="mb-4 md:mb-6">
          <h2 className="font-heading text-[20px] font-bold text-slate-900 md:text-2xl">New filings</h2>
          <p className="mt-1 text-[12px] text-slate-400 md:text-[13px]">10-K / 10-Q on your watch list.</p>
        </div>
        {query.isError ? (
          <p className="text-[13px] text-red-500">Couldn’t load filings.</p>
        ) : items.length === 0 && !query.isPending ? (
          <p className="text-[13px] text-slate-400">No new filings on your watch list.</p>
        ) : (
          <div className="flex flex-col gap-1.5 md:gap-0.5">
            {items.map((item) => {
              const isOpen = openId === item.id;
              return (
                <div
                  key={item.id}
                  className="overflow-hidden rounded-xl border border-slate-100 bg-white md:rounded-[10px]"
                >
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
                    <div className={`size-2 shrink-0 rounded-full ${dotClass(item.form)}`} />
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
                        disabled={dismiss.isPending}
                        onClick={(e) => {
                          e.stopPropagation();
                          dismiss.mutate(item.id);
                        }}
                        className="p-1 text-slate-300 hover:text-slate-500 disabled:opacity-50"
                      >
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path
                            d="M2 2L12 12M12 2L2 12"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                  {isOpen && (
                    <div className="border-t border-slate-100 px-4 pb-4 md:px-5 md:pb-5">
                      <p className="mt-3 mb-4 text-[12px] leading-[1.65] text-slate-500 md:mt-4 md:mb-5 md:text-[13px]">
                        {item.detail || item.teaser}
                      </p>
                      <Link
                        href={item.actionHref}
                        className="inline-flex rounded-lg border border-blue-200 px-4 py-2 text-[12px] font-semibold text-blue-600 hover:bg-blue-50 md:rounded-md md:py-1.5 md:text-[13px]"
                      >
                        {item.actionLabel} →
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
