import { Hono } from "hono";
import { and, asc, eq } from "drizzle-orm";
import {
  METHOD_LABELS,
  buildValuation,
  fairValueFromOutputs,
  isImplementedMethod,
  type ImplementedMethod,
  type PeerMultiple,
  type ValuationAnchors,
  type ValuationAssumptions,
  type ValuationContext,
  type ValuationMethod,
  type ValuationModel,
  type ValuationOutputs,
  type ValuationSnapshot,
  type ValuationWorkbench,
} from "@mystockjournal/shared";
import type { AppEnv } from "../types";
import { db } from "../db";
import { valuationModels, valuationSnapshots } from "../db/schema";
import { TICKER_RE, getOrCreateStock, parseTicker } from "../lib/stocks";
import { getAnchors } from "../market/fundamentals";
import { buildPeChart, peUnavailableReason } from "../market/pe-series";
import { getQuotes } from "../market/quotes";

export const valuationRoutes = new Hono<AppEnv>();

const METHODS = Object.keys(METHOD_LABELS) as ValuationMethod[];

/** Enough peers to read a median from without turning the chart into noise. */
const MAX_PEERS = 8;

function parseChartPeriod(raw: string | undefined): "week" | "month" | "year" | null {
  if (raw === "week" || raw === "month" || raw === "year") return raw;
  return null;
}

function parseMethod(raw: string | undefined): ValuationMethod | null {
  const method = (raw ?? "").trim().toLowerCase();
  return METHODS.find((m) => m === method) ?? null;
}

/** Projections start next calendar year, so this year's partial results are not discounted. */
function nextYear() {
  return new Date().getFullYear() + 1;
}

function toModel(row: typeof valuationModels.$inferSelect): ValuationModel {
  return {
    id: row.id,
    stockId: row.stockId,
    method: row.method,
    assumptions: row.assumptions as ValuationAssumptions,
    outputs: row.outputs as ValuationOutputs,
    isMyFairValue: row.isMyFairValue,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toSnapshot(row: typeof valuationSnapshots.$inferSelect): ValuationSnapshot {
  return {
    id: row.id,
    stockId: row.stockId,
    modelId: row.modelId,
    method: row.method,
    fairValue: Number(row.fairValue),
    createdAt: row.createdAt.toISOString(),
  };
}

function listModels(userId: string, stockId: string) {
  return db
    .select()
    .from(valuationModels)
    .where(and(eq(valuationModels.userId, userId), eq(valuationModels.stockId, stockId)))
    .orderBy(asc(valuationModels.createdAt));
}

function findModel(userId: string, stockId: string, method: ValuationMethod) {
  return db
    .select()
    .from(valuationModels)
    .where(
      and(
        eq(valuationModels.userId, userId),
        eq(valuationModels.stockId, stockId),
        eq(valuationModels.method, method),
      ),
    )
    .limit(1);
}

/**
 * Filed figures belong to the server, not the request body. The valuation page
 * renders them read-only, so a body that disagrees is stale or tampered with.
 * The exception is a ticker no filing covered, where typing the numbers in is
 * the only way to value it at all.
 */
function withServerAnchors(
  method: ImplementedMethod,
  rawAssumptions: unknown,
  anchors: ValuationAnchors,
): unknown {
  if (!anchors.available) return rawAssumptions;

  const body = (
    rawAssumptions && typeof rawAssumptions === "object" ? rawAssumptions : {}
  ) as Record<string, unknown>;

  if (method === "pe") {
    // Mirrors peInputsFromAnchors, so a saved model matches what the page showed.
    return {
      ...body,
      ttmEps: anchors.ttmEps ?? 0,
      fwdEps: anchors.fwdEps ?? anchors.ttmEps ?? 0,
    };
  }

  return {
    ...body,
    ttmRevenue: anchors.ttmRevenue,
    cash: anchors.cash,
    debt: anchors.debt,
    shares: anchors.shares,
    ...(anchors.fcfMarginY1FromFilings
      ? { fcfMarginY1: anchors.drivers.fcfMarginY1 }
      : {}),
  };
}

/** Resolve the ticker, then load the anchors and price the models are computed against. */
async function loadWorkbenchContext(userId: string, rawTicker: string) {
  const found = await getOrCreateStock(userId, rawTicker);
  if ("error" in found) return found;

  const anchors = await getAnchors(found.stock.ticker);
  const ctx: ValuationContext = {
    currentPrice: found.quote.price ?? 0,
    startYear: nextYear(),
  };
  return { ...found, anchors, ctx };
}

/**
 * GET /stocks/:ticker/valuation — everything the valuation page renders in one
 * call: anchors, the live price, and saved worksheets.
 */
valuationRoutes.get("/:ticker/valuation", async (c) => {
  const loaded = await loadWorkbenchContext(c.get("userId"), c.req.param("ticker"));
  if ("error" in loaded) return c.json({ error: loaded.error }, loaded.status);

  const { stock, quote, anchors } = loaded;
  const models = (await listModels(stock.userId, stock.id)).map(toModel);
  const myFairValue = models.find((model) => model.isMyFairValue);

  const payload: ValuationWorkbench = {
    stock: { id: stock.id, ticker: stock.ticker, name: quote.name || stock.name },
    quote,
    anchors,
    models,
    myFairValue: myFairValue ? fairValueFromOutputs(myFairValue.outputs) : null,
  };

  return c.json(payload);
});

/**
 * PUT /stocks/:ticker/valuation/:method — save the live worksheet for one
 * method. There is at most one per stock and method; history lives in snapshots
 * instead. Outputs are always recomputed server-side so a stored fair value can
 * never disagree with its assumptions.
 */
valuationRoutes.put("/:ticker/valuation/:method", async (c) => {
  const method = parseMethod(c.req.param("method"));
  if (!method) return c.json({ error: "Unknown valuation method" }, 404);
  if (!isImplementedMethod(method)) {
    return c.json({ error: `${METHOD_LABELS[method]} is not available yet` }, 400);
  }

  const loaded = await loadWorkbenchContext(c.get("userId"), c.req.param("ticker"));
  if ("error" in loaded) return c.json({ error: loaded.error }, loaded.status);
  const { stock, ctx, anchors } = loaded;

  const body = (await c.req.json().catch(() => null)) as {
    assumptions?: unknown;
    setAsMyFairValue?: unknown;
  } | null;

  const assumptions = withServerAnchors(method, body?.assumptions, anchors);
  const built = buildValuation(method, assumptions, ctx);
  if ("error" in built) return c.json({ error: built.error }, 400);

  const setAsMyFairValue = body?.setAsMyFairValue === true;
  if (setAsMyFairValue && fairValueFromOutputs(built.outputs) == null) {
    return c.json({ error: `${METHOD_LABELS[method]} does not produce a fair value` }, 400);
  }

  const saved = await db.transaction(async (tx) => {
    if (setAsMyFairValue) {
      // Only one model per stock may be My Fair Value, enforced by a partial unique index.
      await tx
        .update(valuationModels)
        .set({ isMyFairValue: false, updatedAt: new Date() })
        .where(
          and(
            eq(valuationModels.userId, stock.userId),
            eq(valuationModels.stockId, stock.id),
            eq(valuationModels.isMyFairValue, true),
          ),
        );
    }

    const existing = await tx
      .select({ id: valuationModels.id, isMyFairValue: valuationModels.isMyFairValue })
      .from(valuationModels)
      .where(
        and(
          eq(valuationModels.userId, stock.userId),
          eq(valuationModels.stockId, stock.id),
          eq(valuationModels.method, method),
        ),
      )
      .limit(1);

    const values = {
      assumptions: built.assumptions,
      outputs: built.outputs,
      isMyFairValue: setAsMyFairValue || (existing[0]?.isMyFairValue ?? false),
      updatedAt: new Date(),
    };

    if (existing[0]) {
      const updated = await tx
        .update(valuationModels)
        .set(values)
        .where(eq(valuationModels.id, existing[0].id))
        .returning();
      return updated[0];
    }

    const inserted = await tx
      .insert(valuationModels)
      .values({ userId: stock.userId, stockId: stock.id, method, ...values })
      .returning();
    return inserted[0];
  });

  return c.json({ model: toModel(saved) });
});

/**
 * POST /stocks/:ticker/valuation/:method/my-fair-value — promote an already
 * saved worksheet to My Fair Value, the number the watch list shows. Methods
 * without a fair value (reverse DCF) are rejected.
 */
valuationRoutes.post("/:ticker/valuation/:method/my-fair-value", async (c) => {
  const method = parseMethod(c.req.param("method"));
  if (!method) return c.json({ error: "Unknown valuation method" }, 404);

  const found = await getOrCreateStock(c.get("userId"), c.req.param("ticker"));
  if ("error" in found) return c.json({ error: found.error }, found.status);
  const { stock } = found;

  const existing = await findModel(stock.userId, stock.id, method);
  if (!existing[0]) return c.json({ error: "Save this model before setting a fair value" }, 404);
  if (fairValueFromOutputs(existing[0].outputs) == null) {
    return c.json({ error: `${METHOD_LABELS[method]} does not produce a fair value` }, 400);
  }

  const updated = await db.transaction(async (tx) => {
    await tx
      .update(valuationModels)
      .set({ isMyFairValue: false, updatedAt: new Date() })
      .where(
        and(
          eq(valuationModels.userId, stock.userId),
          eq(valuationModels.stockId, stock.id),
          eq(valuationModels.isMyFairValue, true),
        ),
      );
    const rows = await tx
      .update(valuationModels)
      .set({ isMyFairValue: true, updatedAt: new Date() })
      .where(eq(valuationModels.id, existing[0].id))
      .returning();
    return rows[0];
  });

  return c.json({ model: toModel(updated) });
});

/**
 * DELETE /stocks/:ticker/valuation/:method/my-fair-value — stop using this
 * method as My Fair Value. The worksheet is kept; only the flag is cleared, so
 * the watch list falls back to showing no fair value.
 */
valuationRoutes.delete("/:ticker/valuation/:method/my-fair-value", async (c) => {
  const method = parseMethod(c.req.param("method"));
  if (!method) return c.json({ error: "Unknown valuation method" }, 404);

  const found = await getOrCreateStock(c.get("userId"), c.req.param("ticker"));
  if ("error" in found) return c.json({ error: found.error }, found.status);

  const cleared = await db
    .update(valuationModels)
    .set({ isMyFairValue: false, updatedAt: new Date() })
    .where(
      and(
        eq(valuationModels.userId, found.stock.userId),
        eq(valuationModels.stockId, found.stock.id),
        eq(valuationModels.method, method),
      ),
    )
    .returning();

  if (!cleared[0]) return c.json({ error: "Model not found" }, 404);
  return c.json({ model: toModel(cleared[0]) });
});

/**
 * POST /stocks/:ticker/valuation/:method/snapshot — freeze the saved worksheet
 * so a decision can keep showing the fair value that informed it, even after
 * the live model is edited.
 */
valuationRoutes.post("/:ticker/valuation/:method/snapshot", async (c) => {
  const method = parseMethod(c.req.param("method"));
  if (!method) return c.json({ error: "Unknown valuation method" }, 404);

  const found = await getOrCreateStock(c.get("userId"), c.req.param("ticker"));
  if ("error" in found) return c.json({ error: found.error }, found.status);
  const { stock } = found;

  const existing = await findModel(stock.userId, stock.id, method);
  if (!existing[0]) return c.json({ error: "Save this model before using it in a decision" }, 404);

  const fairValue = fairValueFromOutputs(existing[0].outputs);
  if (fairValue == null) {
    return c.json({ error: `${METHOD_LABELS[method]} does not produce a fair value` }, 400);
  }

  const inserted = await db
    .insert(valuationSnapshots)
    .values({
      userId: stock.userId,
      stockId: stock.id,
      modelId: existing[0].id,
      method,
      fairValue: String(fairValue),
      assumptions: existing[0].assumptions,
      outputs: existing[0].outputs,
    })
    .returning();

  return c.json({ snapshot: toSnapshot(inserted[0]) }, 201);
});

/**
 * GET /stocks/:ticker/valuation/pe/chart?period=&peers= — P/E series for the
 * chart. `year` uses curated annual multiples; `week` / `month` rebuild P/E from
 * Tencent K-line closes ÷ latest EPS.
 */
valuationRoutes.get("/:ticker/valuation/pe/chart", async (c) => {
  const period = parseChartPeriod(c.req.query("period") ?? "year") ?? "year";
  const ticker = parseTicker(c.req.param("ticker"));
  if (!TICKER_RE.test(ticker)) return c.json({ error: "Invalid ticker" }, 400);

  const peerTickers = (c.req.query("peers") ?? "")
    .split(",")
    .map((raw) => parseTicker(raw))
    .filter((peer) => TICKER_RE.test(peer) && peer !== ticker)
    .slice(0, MAX_PEERS);

  const payload = await buildPeChart(ticker, period, peerTickers);
  return c.json(payload);
});

/**
 * GET /stocks/:ticker/valuation/pe/peers?tickers= — current multiples for the
 * peers a user picked, so the P/E chart can plot them. Capped at MAX_PEERS. A
 * peer we have no EPS for comes back with nulls rather than being dropped.
 */
valuationRoutes.get("/:ticker/valuation/pe/peers", async (c) => {
  const requested = (c.req.query("tickers") ?? "")
    .split(",")
    .map((raw) => parseTicker(raw))
    .filter((ticker) => TICKER_RE.test(ticker));

  const unique = [...new Set(requested)].slice(0, MAX_PEERS);
  if (unique.length === 0) return c.json({ peers: [] });

  const quotes = await getQuotes(unique);
  const quoteByTicker = new Map(quotes.map((quote) => [quote.ticker, quote]));

  const peers: PeerMultiple[] = [];
  for (const ticker of unique) {
    const quote = quoteByTicker.get(ticker);
    const anchors = quote ? await getAnchors(ticker) : null;
    const fwd = anchors?.fwdEps ?? null;
    const ttm = anchors?.ttmEps ?? null;
    const eps =
      fwd != null && fwd > 0 ? fwd : ttm != null ? ttm : fwd != null ? fwd : null;
    const price = quote?.price ?? null;
    const pe = eps != null && eps > 0 && price != null ? price / eps : null;
    const latestGrowth = anchors?.peHistory.at(-1)?.growth ?? null;

    peers.push({
      ticker,
      name: quote?.name ?? ticker,
      price,
      pe,
      peg: pe != null && latestGrowth != null && latestGrowth > 0 ? pe / latestGrowth : null,
      history: anchors?.peHistory ?? [],
      peUnavailableReason: pe == null ? peUnavailableReason(price, eps) : null,
    });
  }

  return c.json({ peers });
});

/**
 * DELETE /stocks/:ticker/valuation/:method — discard a worksheet. Registered
 * after the more specific `/pe/peers` and `/my-fair-value` paths so it cannot
 * shadow them.
 */
valuationRoutes.delete("/:ticker/valuation/:method", async (c) => {
  const method = parseMethod(c.req.param("method"));
  if (!method) return c.json({ error: "Unknown valuation method" }, 404);

  const found = await getOrCreateStock(c.get("userId"), c.req.param("ticker"));
  if ("error" in found) return c.json({ error: found.error }, found.status);

  const existing = await findModel(found.stock.userId, found.stock.id, method);
  if (!existing[0]) return c.json({ error: "Model not found" }, 404);

  await db.transaction(async (tx) => {
    // Snapshots outlive the worksheet they came from — detach rather than cascade.
    await tx
      .update(valuationSnapshots)
      .set({ modelId: null })
      .where(eq(valuationSnapshots.modelId, existing[0].id));
    await tx.delete(valuationModels).where(eq(valuationModels.id, existing[0].id));
  });

  return c.json({ ok: true });
});
