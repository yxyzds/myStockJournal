"use client";

import { SignIn, SignUp } from "@clerk/nextjs";
import { LogoMark } from "@/components/logo-mark";
import { useI18n } from "@/i18n";

export function ClerkSignScreen({ mode }: { mode: "sign-in" | "sign-up" }) {
  const { t } = useI18n();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4">
      <div className="mb-8 flex items-center gap-2">
        <LogoMark size={30} />
        <span className="font-heading text-[15px] font-semibold tracking-tight text-slate-900">
          {t("common.brand")}
        </span>
      </div>
      {mode === "sign-in" ? <SignIn /> : <SignUp />}
    </div>
  );
}
