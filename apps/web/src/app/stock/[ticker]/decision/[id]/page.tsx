import { DecisionDetail, DecisionNotFound } from "@/components/decision-detail";
import { findDecision } from "@/lib/mock-journal";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ ticker: string; id: string }>;
}): Promise<Metadata> {
  const { ticker, id } = await params;
  const decision = findDecision(ticker, id);
  if (!decision) return { title: "Decision not found" };
  return { title: `${decision.ticker} · ${decision.action}` };
}

export default async function DecisionPage({
  params,
}: {
  params: Promise<{ ticker: string; id: string }>;
}) {
  const { ticker, id } = await params;
  const decision = findDecision(ticker, id);
  if (!decision) return <DecisionNotFound />;
  return <DecisionDetail decision={decision} />;
}
