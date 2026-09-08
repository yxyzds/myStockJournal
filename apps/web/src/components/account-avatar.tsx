"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { isClerkEnabled, type Me } from "@/lib/clerk";
import { useI18n } from "@/i18n";
import { initials } from "@/lib/initials";
import { cn } from "@/lib/utils";

export function AccountAvatar({
  className,
  label = undefined,
}: {
  className?: string;
  label?: string;
}) {
  const { t } = useI18n();
  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => api<Me>("/me"),
  });
  const href = me.data || !isClerkEnabled ? "/settings" : "/sign-in";

  return (
    <Link
      href={href}
      aria-label={label ?? t("common.account")}
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold tracking-wide text-white",
        className,
      )}
    >
      {me.data ? initials(me.data.name) : ""}
    </Link>
  );
}
