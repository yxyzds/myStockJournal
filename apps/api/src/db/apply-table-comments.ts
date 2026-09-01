import { sql } from "drizzle-orm";
import { db } from "./index";

/** Postgres COMMENT ON TABLE，和 schema.ts 里各表的 JSDoc 保持一致。 */
const TABLE_COMMENTS: Record<string, string> = {
  users: "本应用用户。V1 没有登录 UI，启动时写入 .env 里的固定 Dev 用户。",
  stocks: "用户跟踪的标的（Watch List），含投资论点与健康度。",
  valuation_models: "某只股票的估值模型（DCF / P/E 等）。每只股票最多一个「我的公允价值」。",
  valuation_snapshots: "估值快照：做决策时锁定的公允价值与假设，事后不随模型改动。",
  decisions: "买卖或论点更新的决策记录，可附评分与当时的估值快照。",
  journal_entries: "投资日记：论点、观察、以及什么会改变看法。",
  judgment_items: "首页「Needs your judgment」待处理事项，用户可关闭。",
  quote_cache: "外部行情缓存，按 ticker 全局共享，不含 user_id。",
  fundamentals_cache: "外部基本面 / 财报缓存，按 ticker 全局共享，不含 user_id。",
};

export async function applyTableComments() {
  for (const [table, comment] of Object.entries(TABLE_COMMENTS)) {
    await db.execute(sql`COMMENT ON TABLE ${sql.identifier(table)} IS ${comment}`);
  }
}
