import { sql } from "drizzle-orm";
import { db } from "../db";

export const DAILY_AI_REVIEW_LIMIT = 20;
export const DAILY_AI_IMPORT_LIMIT = 10;

export const AI_REVIEW_LIMIT_ERROR = "Daily AI review limit reached (20). Try again tomorrow.";
export const AI_IMPORT_LIMIT_ERROR = "Daily screenshot import limit reached (10). Try again tomorrow.";

function quotaDay() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "UTC" });
}

function rowCount(result: unknown): number {
  if (Array.isArray(result)) return result.length;
  if (result && typeof result === "object" && "rows" in result && Array.isArray(result.rows)) {
    return result.rows.length;
  }
  if (result && typeof result === "object" && "length" in result && typeof result.length === "number") {
    return result.length;
  }
  return 0;
}

/** Atomically take one of today's slots. Shared by Trade review and DCF review. */
export async function consumeAiReviewSlot(userId: string): Promise<boolean> {
  const day = quotaDay();
  const result = await db.execute(sql`
    INSERT INTO ai_review_usage (user_id, day, count)
    VALUES (${userId}::uuid, ${day}::date, 1)
    ON CONFLICT (user_id, day)
    DO UPDATE SET count = ai_review_usage.count + 1
    WHERE ai_review_usage.count < ${DAILY_AI_REVIEW_LIMIT}
    RETURNING count
  `);
  return rowCount(result) > 0;
}

/** Give the slot back if the model call failed after we reserved it. */
export async function releaseAiReviewSlot(userId: string) {
  const day = quotaDay();
  await db.execute(sql`
    UPDATE ai_review_usage
    SET count = count - 1
    WHERE user_id = ${userId}::uuid AND day = ${day}::date AND count > 0
  `);
}

/** Atomically take one of today's screenshot-import slots. */
export async function consumeAiImportSlot(userId: string): Promise<boolean> {
  const day = quotaDay();
  const result = await db.execute(sql`
    INSERT INTO ai_import_usage (user_id, day, count)
    VALUES (${userId}::uuid, ${day}::date, 1)
    ON CONFLICT (user_id, day)
    DO UPDATE SET count = ai_import_usage.count + 1
    WHERE ai_import_usage.count < ${DAILY_AI_IMPORT_LIMIT}
    RETURNING count
  `);
  return rowCount(result) > 0;
}

/** Give the import slot back if vision failed after we reserved it. */
export async function releaseAiImportSlot(userId: string) {
  const day = quotaDay();
  await db.execute(sql`
    UPDATE ai_import_usage
    SET count = count - 1
    WHERE user_id = ${userId}::uuid AND day = ${day}::date AND count > 0
  `);
}
