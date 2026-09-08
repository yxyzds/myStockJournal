import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Playfair_Display } from "next/font/google";
import { AppProviders } from "@/components/app-providers";
import { I18nProvider } from "@/i18n/provider";
import { bcp47 } from "@/i18n/locale";
import { getRequestLocale, getServerT } from "@/i18n/server";
import { cn } from "@/lib/utils";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerT();
  return {
    title: t("meta.title"),
    description: t("meta.description"),
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getRequestLocale();
  return (
    <html
      lang={bcp47(locale)}
      className={cn("h-full antialiased font-sans", inter.variable, playfair.variable, jetbrains.variable)}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <I18nProvider initialLocale={locale}>
          <AppProviders>{children}</AppProviders>
        </I18nProvider>
      </body>
    </html>
  );
}
