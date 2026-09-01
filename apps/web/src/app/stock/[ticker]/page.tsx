import { StockDetail } from "@/components/stock-detail";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

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
  return { title: ticker };
}

export default async function StockPage({ params }: { params: Promise<{ ticker: string }> }) {
  const ticker = parseTicker((await params).ticker);
  if (!TICKER_RE.test(ticker)) notFound();
  return <StockDetail ticker={ticker} />;
}
