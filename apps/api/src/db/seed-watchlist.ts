import { and, eq, sql } from "drizzle-orm";
import { env } from "../env";
import { db } from "./index";
import { stocks, valuationModels } from "./schema";

const SEED: { ticker: string; name: string }[] = [
  { ticker: "AAPL", name: "Apple Inc." },
  { ticker: "GOOGL", name: "Alphabet Inc." },
  { ticker: "NVDA", name: "NVIDIA Corp." },
];

export async function seedWatchlist() {
  await db.delete(valuationModels).where(sql`${valuationModels.assumptions}->>'source' = 'seed'`);

  for (const row of SEED) {
    const existing = await db
      .select({ id: stocks.id })
      .from(stocks)
      .where(and(eq(stocks.userId, env.localUserId), eq(stocks.ticker, row.ticker)))
      .limit(1);

    if (existing.length > 0) continue;

    await db.insert(stocks).values({
      userId: env.localUserId,
      ticker: row.ticker,
      name: row.name,
    });
  }
}
