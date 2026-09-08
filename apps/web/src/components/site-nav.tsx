"use client";

import Link from "next/link";
import { AccountAvatar } from "@/components/account-avatar";
import { LogoMark } from "@/components/logo-mark";
import { NavLocaleToggle } from "@/components/language-switcher";
import { useI18n } from "@/i18n";

export function SiteNav() {
  const { t } = useI18n();
  return (
    <header className="sticky top-0 z-30 w-full border-b border-slate-100 bg-white pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex h-14 max-w-[1080px] items-center justify-between px-4 md:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-2">
          <LogoMark size={30} />
          <span className="font-heading truncate text-[15px] font-semibold tracking-tight text-slate-900">
            {t("common.brand")}
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <NavLocaleToggle />
          <AccountAvatar />
        </div>
      </div>
    </header>
  );
}
