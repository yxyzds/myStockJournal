import { en } from "./en";
import { ja } from "./ja";
import { zh } from "./zh";
import { zhHant } from "./zh-hant";
import type { Locale } from "../locale";
import type { Messages } from "../types";

export const messages: Record<Locale, Messages> = {
  en,
  zh,
  "zh-TW": zhHant,
  ja,
};
