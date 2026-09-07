"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { isClerkEnabled, type Me } from "@/lib/clerk";
import { initials } from "@/lib/initials";
import { cn } from "@/lib/utils";

export function AccountAvatar({
  className,
  label = "Account",
}: {
  className?: string;
  label?: string;
}) {
  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => api<Me>("/me"),
  });
  const href = me.data || !isClerkEnabled ? "/settings" : "/sign-in";

  return (
    <Link
      href={href}
      aria-label={label}
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold tracking-wide text-white",
        className,
      )}
    >
      {me.data ? initials(me.data.name) : ""}
    </Link>
  );
}
