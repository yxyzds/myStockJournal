import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/** Buy / sell / thesis-update — the three journal decision types. */
export const decisionTypeEnum = pgEnum("decision_type", ["buy", "sell", "thesis_update"]);
/** Valuation methods the user can run: DCF, reverse DCF, P/E, EV/EBITDA, sum-of-the-parts. */
export const valuationMethodEnum = pgEnum("valuation_method", [
  "dcf",
  "rdcf",
  "pe",
  "evebitda",
  "sotp",
]);

/** App accounts. V1 has no login UI; we seed one local Dev user. */
export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** A stock the user tracks. `watched` is the home Watch List; unwatching keeps journal rows. */
export const stocks = pgTable(
  "stocks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    ticker: text("ticker").notNull(),
    name: text("name").notNull(),
    thesis: text("thesis"),
    watched: boolean("watched").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("stocks_user_ticker_uidx").on(table.userId, table.ticker),
    index("stocks_user_id_idx").on(table.userId),
  ],
);

/**
 * Live valuation worksheets (assumptions + outputs).
 * Exactly one row per stock can be flagged `isMyFairValue` — that number is "My Fair Value" on the watch list.
 */
export const valuationModels = pgTable(
  "valuation_models",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    stockId: uuid("stock_id")
      .notNull()
      .references(() => stocks.id),
    method: valuationMethodEnum("method").notNull(),
    assumptions: jsonb("assumptions").notNull().default({}),
    outputs: jsonb("outputs").notNull().default({}),
    isMyFairValue: boolean("is_my_fair_value").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("valuation_models_stock_idx").on(table.userId, table.stockId),
    uniqueIndex("valuation_models_one_mfv_uidx")
      .on(table.userId, table.stockId)
      .where(sql`${table.isMyFairValue} = true`),
  ],
);

/** Frozen copy of a valuation at a point in time, so a later decision can still show what FV you used then. */
export const valuationSnapshots = pgTable(
  "valuation_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    stockId: uuid("stock_id")
      .notNull()
      .references(() => stocks.id),
    modelId: uuid("model_id").references(() => valuationModels.id),
    method: valuationMethodEnum("method").notNull(),
    fairValue: numeric("fair_value", { precision: 12, scale: 4 }).notNull(),
    assumptions: jsonb("assumptions").notNull().default({}),
    outputs: jsonb("outputs").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("valuation_snapshots_stock_idx").on(table.userId, table.stockId)],
);

/** One buy, sell, or thesis update — the core journal record, optionally scored and linked to a valuation snapshot. */
export const decisions = pgTable(
  "decisions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    stockId: uuid("stock_id")
      .notNull()
      .references(() => stocks.id),
    type: decisionTypeEnum("type").notNull(),
    date: date("date").notNull(),
    price: numeric("price", { precision: 12, scale: 4 }),
    qty: numeric("qty", { precision: 18, scale: 4 }),
    rationale: text("rationale").notNull(),
    why: text("why"),
    expected: text("expected"),
    falsifier: text("falsifier"),
    score: integer("score"),
    scoreBreakdown: jsonb("score_breakdown"),
    valuationSnapshotId: uuid("valuation_snapshot_id").references(() => valuationSnapshots.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("decisions_user_date_idx").on(table.userId, table.date),
    index("decisions_stock_idx").on(table.userId, table.stockId),
  ],
);

/** Free-text notes on a stock (thesis, observations, what would change your mind). */
export const journalEntries = pgTable(
  "journal_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    stockId: uuid("stock_id")
      .notNull()
      .references(() => stocks.id),
    date: date("date").notNull(),
    text: text("text").notNull(),
    /** Market snapshot at save time: { price, currency, pe }. */
    snapshot: jsonb("snapshot"),
    archived: boolean("archived").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("journal_entries_stock_idx").on(table.userId, table.stockId)],
);

/** Open loops on the home page ("Needs your judgment") — review a thesis, a filing, or an exit. */
export const judgmentItems = pgTable(
  "judgment_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    stockId: uuid("stock_id").references(() => stocks.id),
    title: text("title").notNull(),
    teaser: text("teaser").notNull(),
    detail: text("detail").notNull().default(""),
    actionLabel: text("action_label").notNull(),
    actionHref: text("action_href"),
    dismissed: boolean("dismissed").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("judgment_items_user_idx").on(table.userId, table.dismissed)],
);

/** Shared vendor quotes, reused until the next US Eastern calendar day. No user_id. */
export const quoteCache = pgTable("quote_cache", {
  ticker: text("ticker").primaryKey(),
  /** Vendor last trade as received. API Quote.price is remapped to prior close. */
  price: numeric("price", { precision: 12, scale: 4 }).notNull(),
  currency: text("currency").notNull().default("USD"),
  changePercent: numeric("change_percent", { precision: 12, scale: 6 }),
  previousClose: numeric("previous_close", { precision: 12, scale: 4 }),
  shortName: text("short_name"),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Shared company fundamentals (e.g. SEC company facts). No user_id — cached by ticker, not per user. */
export const fundamentalsCache = pgTable("fundamentals_cache", {
  ticker: text("ticker").primaryKey(),
  payload: jsonb("payload").notNull(),
  period: text("period"),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
});
