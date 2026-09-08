"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { JudgmentItem } from "@mystockjournal/shared";
import { useI18n, type Translate } from "@/i18n";
import { api } from "@/lib/api";
import { formatEntryDate } from "@/lib/format";

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

function filingCopy(item: JudgmentItem, t: Translate) {
  if (!item.filingDate) {
    return {
      title: item.title,
      teaser: item.teaser,
      detail: item.detail || item.teaser,
      actionLabel: item.actionLabel,
    };
  }
  const filed = formatEntryDate(item.filingDate);
  const period = item.reportDate ? formatEntryDate(item.reportDate) : null;
  return {
    title: t("filings.filedTitle", { ticker: item.ticker, form: item.form }),
    teaser: period
      ? t("filings.teaserWithPeriod", { filed, period })
      : t("filings.teaser", { filed }),
    detail: period
      ? t("filings.detailWithPeriod", {
          ticker: item.ticker,
          form: item.form,
          filed,
          period,
        })
      : t("filings.detail", { ticker: item.ticker, form: item.form, filed }),
    actionLabel: t("filings.action"),
  };
}

export function JudgmentAccordion() {
  const { t } = useI18n();
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
          <h2 className="font-heading text-[20px] font-bold text-slate-900 md:text-2xl">{t("filings.title")}</h2>
          <p className="mt-1 text-[12px] text-slate-400 md:text-[13px]">{t("filings.subtitle")}</p>
        </div>
        {query.isError ? (
          <p className="text-[13px] text-red-500">{t("filings.loadError")}</p>
        ) : items.length === 0 && !query.isPending ? (
          <p className="text-[13px] text-slate-400">{t("filings.empty")}</p>
        ) : (
          <div className="flex flex-col gap-1.5 md:gap-0.5">
            {items.map((item) => {
              const isOpen = openId === item.id;
              const copy = filingCopy(item, t);
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
                        {copy.title}
                      </span>
                      {!isOpen && (
                        <span className="mt-0.5 block truncate text-[12px] text-slate-400 md:text-[13px]">
                          {copy.teaser}
                        </span>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <ChevronIcon open={isOpen} />
                      <button
                        type="button"
                        aria-label={t("common.dismiss")}
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
                        {copy.detail}
                      </p>
                      <Link
                        href={item.actionHref}
                        className="inline-flex rounded-lg border border-blue-200 px-4 py-2 text-[12px] font-semibold text-blue-600 hover:bg-blue-50 md:rounded-md md:py-1.5 md:text-[13px]"
                      >
                        {copy.actionLabel} →
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
