import {
  TXN_IMAGE_MAX_TRADES,
  type ExtractedTrade,
} from "@mystockjournal/shared";
import { env } from "../env";
import { chatJson } from "./chat";

function asFinite(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function asTicker(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const ticker = value.trim().toUpperCase();
  return /^[A-Z0-9][A-Z0-9.\-]{0,15}$/.test(ticker) ? ticker : null;
}

function asType(value: unknown): "buy" | "sell" | null {
  const raw = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (raw === "buy" || raw === "bought" || raw === "long") return "buy";
  if (raw === "sell" || raw === "sold" || raw === "short") return "sell";
  return null;
}

function asDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const date = new Date(`${raw}T12:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  const [year, month, day] = raw.split("-").map(Number);
  if (date.getFullYear() !== year || date.getMonth() + 1 !== month || date.getDate() !== day) {
    return null;
  }
  return raw;
}

function asCurrency(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const ccy = value.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(ccy) ? ccy : null;
}

function parseTrade(row: unknown): ExtractedTrade | null {
  if (!row || typeof row !== "object") return null;
  const item = row as Record<string, unknown>;
  const trade: ExtractedTrade = {
    ticker: asTicker(item.ticker),
    type: asType(item.type),
    price: asFinite(item.price),
    qty: asFinite(item.qty),
    date: asDate(item.date),
    currency: asCurrency(item.currency),
  };
  if (trade.type == null && trade.price == null && trade.qty == null) return null;
  return trade;
}

export function filterExtractedTrades(
  trades: ExtractedTrade[],
  pageTicker: string,
): { kept: ExtractedTrade[]; skippedCount: number } {
  const page = pageTicker.trim().toUpperCase();
  const kept: ExtractedTrade[] = [];
  let skippedCount = 0;
  for (const trade of trades) {
    const ticker = trade.ticker ?? page;
    const currency = trade.currency ?? "USD";
    if (ticker !== page || currency !== "USD") {
      skippedCount += 1;
      continue;
    }
    kept.push({ ...trade, ticker: page, currency: "USD" });
  }
  return { kept, skippedCount };
}

const SYSTEM = `Extract completed stock fills from the screenshot. JSON only:
{"trades":[{"ticker":"AAPL","type":"buy","price":150.25,"qty":10,"date":"2026-03-15","currency":"USD"}],"skippedNote":null}
Rules: do not invent numbers. buy/sell from 买入/買入/Bought or 卖出/賣出/Sold. date YYYY-MM-DD (infer year if missing, not future). price per share, qty is shares. currency ISO-4217, USD if unlabeled US broker. Ignore quotes, P&L, cancelled. Max ${TXN_IMAGE_MAX_TRADES} trades. Empty: {"trades":[],"skippedNote":"no trades found"}.`;

export async function extractTradesFromImage(imageDataUrl: string): Promise<{
  trades: ExtractedTrade[];
  skippedNote: string | null;
}> {
  if (!env.aiVisionModel) {
    throw new Error("Set AI_VISION_MODEL in .env to enable screenshot import");
  }

  const raw = await chatJson(
    [
      { role: "system", content: SYSTEM },
      {
        role: "user",
        content: [
          { type: "text", text: "Extract every completed buy or sell." },
          { type: "image_url", image_url: { url: imageDataUrl } },
        ],
      },
    ],
    {
      model: env.aiVisionModel,
      timeoutMs: 90_000,
      temperature: 0,
      thinking: "disabled",
    },
  );

  const body = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const trades = Array.isArray(body.trades)
    ? body.trades.map(parseTrade).filter((row): row is ExtractedTrade => row != null).slice(0, TXN_IMAGE_MAX_TRADES)
    : [];
  const skippedNote = typeof body.skippedNote === "string" && body.skippedNote.trim() ? body.skippedNote.trim() : null;
  return { trades, skippedNote };
}
