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

export const decisionTypeEnum = pgEnum("decision_type", ["buy", "sell", "thesis_update"]);
export const thesisHealthEnum = pgEnum("thesis_health", ["healthy", "weakening"]);
export const valuationMethodEnum = pgEnum("valuation_method", [
  "dcf",
  "rdcf",
  "pe",
  "evebitda",
  "sotp",
]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

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
    coreQuestion: text("core_question"),
    health: thesisHealthEnum("health").notNull().default("healthy"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("stocks_user_ticker_uidx").on(table.userId, table.ticker),
    index("stocks_user_id_idx").on(table.userId),
  ],
);

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
    archived: boolean("archived").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("journal_entries_stock_idx").on(table.userId, table.stockId)],
);

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

export const quoteCache = pgTable("quote_cache", {
  ticker: text("ticker").primaryKey(),
  price: numeric("price", { precision: 12, scale: 4 }).notNull(),
  currency: text("currency").notNull().default("USD"),
  changePercent: numeric("change_percent", { precision: 12, scale: 6 }),
  previousClose: numeric("previous_close", { precision: 12, scale: 4 }),
  shortName: text("short_name"),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
});

export const fundamentalsCache = pgTable("fundamentals_cache", {
  ticker: text("ticker").primaryKey(),
  payload: jsonb("payload").notNull(),
  period: text("period"),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
});
