import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ValuationWorkbenchPage } from "@/components/valuation/valuation-workbench";

const TICKER_RE = /^[A-Z0-9][A-Z0-9.\-]{0,15}$/;

function parseTicker(raw: string) {
  return decodeURIComponent(raw).trim().toUpperCase();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ ticker: string }>;
}): Promise<Metadata> {
  const ticker = parseTicker((await params).ticker);
  return { title: `${ticker} · Valuation` };
}

export default async function ValuationPage({ params }: { params: Promise<{ ticker: string }> }) {
  const ticker = parseTicker((await params).ticker);
  if (!TICKER_RE.test(ticker)) notFound();
  return <ValuationWorkbenchPage ticker={ticker} />;
}
