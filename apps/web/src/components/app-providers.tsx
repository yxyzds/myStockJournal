"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { jaJP, zhCN, zhTW } from "@clerk/localizations";
import { QueryProvider } from "@/components/query-provider";
import { useI18n } from "@/i18n";
import type { Locale } from "@/i18n/locale";
import { isClerkEnabled } from "@/lib/clerk";

function clerkLocalization(locale: Locale) {
  if (locale === "zh") return zhCN;
  if (locale === "zh-TW") return zhTW;
  if (locale === "ja") return jaJP;
  return undefined;
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  const { locale } = useI18n();
  const inner = <QueryProvider>{children}</QueryProvider>;
  if (!isClerkEnabled) return inner;
  return (
    <ClerkProvider
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      afterSignOutUrl="/sign-in"
      localization={clerkLocalization(locale)}
      appearance={{
        variables: {
          colorPrimary: "#0f172a",
          borderRadius: "0.6rem",
          fontSize: "16px",
        },
      }}
    >
      {inner}
    </ClerkProvider>
  );
}
