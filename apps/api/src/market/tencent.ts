import type { Quote } from "@mystockjournal/shared";

const QUOTE_URL = "https://qt.gtimg.cn/q=";
const SEARCH_URL = "https://smartbox.gtimg.cn/s3/";

function num(value: string | undefined): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function baseTicker(symbol: string) {
  return symbol.replace(/\.(OQ|N|O|A|OB|PK|US)$/i, "").toUpperCase();
}

function decodeMaybeUnicode(value: string) {
  try {
    return JSON.parse(`"${value.replace(/"/g, '\\"')}"`) as string;
  } catch {
    return value;
  }
}

export function parseTencentQuote(line: string): Quote | null {
  const payload = line.match(/="([^"]*)"/)?.[1];
  if (!payload) return null;
  const parts = payload.split("~");
  if (parts.length < 6) return null;

  const ticker = baseTicker(parts[2] ?? "");
  // parts[3] = last trade; parts[4] = prior-session close (the valuation reference).
  const last = num(parts[3]);
  const previousClose = num(parts[4]);
  if (!ticker || (last == null && previousClose == null)) return null;

  const changePercent =
    last != null && previousClose && previousClose !== 0
      ? ((last - previousClose) / previousClose) * 100
      : null;

  const usdIdx = parts.findIndex((p) => p === "USD" || p === "HKD" || p === "CNY");
  const englishName = parts.find((p, i) => i > (usdIdx === -1 ? 30 : usdIdx) && /[A-Za-z]{3,}/.test(p));

  return {
    ticker,
    name: englishName?.trim() || ticker,
    price: last,
    currency: usdIdx >= 0 ? parts[usdIdx] : "USD",
    changePercent,
    previousClose,
    fetchedAt: new Date().toISOString(),
  };
}

export function parseTencentHint(body: string): { ticker: string; name: string }[] {
  const raw = body.match(/v_hint="([^"]*)"/)?.[1];
  if (!raw || raw === "N") return [];
  return raw
    .split("^")
    .map((chunk) => {
      const [market, symbol, name] = chunk.split("~");
      if (market !== "us" || !symbol) return null;
      return { ticker: baseTicker(symbol), name: decodeMaybeUnicode(name ?? "") };
    })
    .filter((row): row is { ticker: string; name: string } => Boolean(row?.ticker));
}

async function getText(url: string) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0",
      Referer: "https://finance.qq.com/",
    },
  });
  if (!res.ok) throw new Error(`Tencent HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  return buf.toString("latin1");
}

export async function fetchTencentQuotes(tickers: string[]): Promise<Quote[]> {
  const unique = [...new Set(tickers.map((t) => t.trim().toUpperCase()).filter(Boolean))];
  if (unique.length === 0) return [];
  const q = unique.map((t) => `us${t}`).join(",");
  const text = await getText(`${QUOTE_URL}${q}`);
  return text
    .split(";")
    .map(parseTencentQuote)
    .filter((row): row is Quote => row != null);
}

export async function searchTencent(query: string): Promise<{ ticker: string; name: string }[]> {
  const q = query.trim();
  if (!q) return [];
  const url = `${SEARCH_URL}?v=2&t=us&q=${encodeURIComponent(q)}`;
  const text = await getText(url);
  const hits = parseTencentHint(text);
  if (/^[A-Za-z][A-Za-z0-9.]{0,9}$/.test(q)) {
    const exact = q.toUpperCase();
    if (!hits.some((h) => h.ticker === exact)) hits.unshift({ ticker: exact, name: exact });
  }
  const seen = new Set<string>();
  return hits.filter((h) => {
    if (seen.has(h.ticker)) return false;
    seen.add(h.ticker);
    return true;
  });
}
