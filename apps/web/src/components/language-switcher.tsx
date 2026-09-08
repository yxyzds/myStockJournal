"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/i18n";
import { LOCALES, LOCALE_LABELS, LOCALE_SHORT, type Locale } from "@/i18n/locale";

function LocaleMenu({
  locale,
  setLocale,
  onClose,
  align = "right",
}: {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  onClose: () => void;
  align?: "left" | "right";
}) {
  return (
    <div
      role="listbox"
      className={`absolute top-[calc(100%+6px)] z-[80] min-w-[160px] overflow-hidden rounded-xl border border-[#ebf0f5] bg-white py-1 shadow-[0_8px_28px_rgba(15,23,42,0.12)] ${
        align === "right" ? "right-0" : "left-0"
      }`}
    >
      {LOCALES.map((id) => (
        <button
          key={id}
          type="button"
          role="option"
          aria-selected={locale === id}
          onClick={() => {
            setLocale(id);
            onClose();
          }}
          className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-[13px] ${
            locale === id ? "bg-blue-50 font-semibold text-blue-700" : "text-slate-700 hover:bg-slate-50"
          }`}
        >
          <span>{LOCALE_LABELS[id]}</span>
          <span className="text-[11px] font-semibold text-slate-400">{LOCALE_SHORT[id]}</span>
        </button>
      ))}
    </div>
  );
}

function useLocaleMenu() {
  const { locale, setLocale, t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return { locale, setLocale, t, open, setOpen, ref };
}

/** Compact language dropdown for page headers. */
export function NavLocaleToggle() {
  const { locale, setLocale, t, open, setOpen, ref } = useLocaleMenu();
  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        aria-label={t("language.label")}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 rounded-full bg-[#f4f6f9] px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-[#ebf0f5]"
      >
        <span>{LOCALE_SHORT[locale]}</span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 12 12"
          fill="none"
          aria-hidden
          className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
      {open ? (
        <LocaleMenu locale={locale} setLocale={setLocale} onClose={() => setOpen(false)} />
      ) : null}
    </div>
  );
}

export function LanguageSwitcher() {
  const { locale, setLocale, t, open, setOpen, ref } = useLocaleMenu();
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-[12px] font-semibold tracking-wide text-slate-600 uppercase">{t("language.label")}</p>
      <div ref={ref} className="relative w-full max-w-[280px]">
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between rounded-[9px] border border-slate-200 bg-white px-3.5 py-2.5 text-[14px] text-slate-800 outline-none hover:border-slate-300"
        >
          <span>{LOCALE_LABELS[locale]}</span>
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            aria-hidden
            className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
          >
            <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
        {open ? (
          <LocaleMenu locale={locale} setLocale={setLocale} onClose={() => setOpen(false)} align="left" />
        ) : null}
      </div>
      <p className="text-[11px] text-slate-400">{t("language.hint")}</p>
    </div>
  );
}
