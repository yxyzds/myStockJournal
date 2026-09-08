import type { MessageKey } from "./types";

/** English API error strings → i18n keys. */
export const API_ERROR_KEYS: Record<string, MessageKey> = {
  Unauthorized: "errors.unauthorized",
  "Invalid ticker": "errors.invalidTicker",
  "Ticker not found": "errors.tickerNotFound",
  "User not found": "errors.userNotFound",
  "name and email are required": "errors.nameEmailRequired",
  "Could not save profile": "errors.saveProfile",
  "Item not found": "errors.itemNotFound",
  "Ticker not on watch list": "errors.tickerNotOnWatch",
  "Invalid body": "errors.invalidBody",
  "Type must be buy or sell": "errors.typeBuySell",
  "Reason is required": "errors.reasonRequired",
  "Price must be greater than 0": "errors.priceGt0",
  "Quantity must be greater than 0": "errors.qtyGt0",
  "A valid date is required": "errors.validDate",
  "Date cannot be in the future": "errors.dateFuture",
  "Entry text is required": "errors.entryText",
  "Entry not found": "errors.entryNotFound",
  "Transaction not found": "errors.txnNotFound",
  "Set AI_BASE_URL and AI_API_KEY in .env to enable Trade review": "errors.aiTradeOff",
  "Write at least one journal entry before asking for a review": "errors.needJournal",
  "Record at least one buy and one sell before asking for a review": "errors.needBuySell",
  "Set a fair value before asking for a review": "errors.needFairValue",
  "Set AI_BASE_URL and AI_API_KEY in .env to enable DCF review": "errors.aiDcfOff",
  "Unknown valuation method": "errors.unknownMethod",
  "Save this model before setting a fair value": "errors.saveBeforeFv",
  "Model not found": "errors.modelNotFound",
  "Save this model before using it in a decision": "errors.saveBeforeDecision",
  "Query too long": "errors.queryTooLong",
  "Search failed": "errors.searchFailed",
  "A current market price is required to value this stock": "errors.needPrice",
  "EPS 为零或为负，P/E 无定义。": "errors.peUndefined",
  "P/E is undefined when EPS is zero or negative.": "errors.peUndefined",
  "EBITDA 为零或为负，EV/EBITDA 无定义。": "errors.evebitdaUndefined",
  "EV/EBITDA is undefined when EBITDA is zero or negative.": "errors.evebitdaUndefined",
  "暂无行情价格，无法计算 P/E。": "pe.noQuotePe",
  "无 EPS 数据（ETF 等标的暂不支持）。": "pe.noEps",
  "暂无行情价格，无法计算 EV/EBITDA。": "pe.noQuoteEvebitda",
  "无 EBITDA 数据（财报未披露经营利润或折旧摊销）。": "pe.noEbitda",
};

const METHOD_UNAVAILABLE = / is not available yet$/;

export function apiErrorKey(message: string): MessageKey | null {
  if (API_ERROR_KEYS[message]) return API_ERROR_KEYS[message];
  if (METHOD_UNAVAILABLE.test(message)) return "errors.methodUnavailable";
  return null;
}
