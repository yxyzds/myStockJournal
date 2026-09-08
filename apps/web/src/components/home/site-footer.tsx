"use client";

import { useI18n } from "@/i18n";

export function SiteFooter() {
  const { t } = useI18n();
  return (
    <footer className="border-t border-slate-100 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] md:py-8">
      <div className="mx-auto flex max-w-[1080px] flex-col items-center gap-1.5 px-4 text-center md:flex-row md:justify-between md:px-8 md:text-left">
        <span className="font-heading text-[13px] text-slate-400 italic">{t("common.brand")}</span>
        <span className="text-[12px] text-slate-300">{t("common.tagline")}</span>
      </div>
    </footer>
  );
}
