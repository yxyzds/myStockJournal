export const TXN_IMAGE_MAX_RAW_BYTES = 8 * 1024 * 1024;
export const TXN_IMAGE_MAX_DECODED_BYTES = 4 * 1024 * 1024;
export const TXN_IMAGE_MAX_FILENAME = 128;
export const TXN_IMAGE_MAX_TRADES = 20;

const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

const FILENAME_RE = /^[A-Za-z0-9._ -]+$/;

export type TxnImageReject = "too_large" | "bad_name" | "bad_type";

export type ExtractedTrade = {
  ticker: string | null;
  type: "buy" | "sell" | null;
  price: number | null;
  qty: number | null;
  date: string | null;
  currency: string | null;
};

export type TxnExtractResponse = {
  trades: ExtractedTrade[];
  skippedCount: number;
  skippedNote: string | null;
};

export function txnImageErrorMessage(code: TxnImageReject): string {
  if (code === "too_large") return "Image file is too large";
  if (code === "bad_name") return "Image filename is invalid";
  return "Image type is not allowed";
}

/** Last path segment only — rejects `../` by failing the name rules. */
export function txnImageBasename(filename: string): string {
  const parts = filename.trim().split(/[/\\]+/);
  return parts[parts.length - 1] ?? "";
}

export function validateTxnImageMeta(input: {
  filename: string;
  mediaType: string;
  byteLength: number;
  maxBytes?: number;
}): TxnImageReject | null {
  const maxBytes = input.maxBytes ?? TXN_IMAGE_MAX_RAW_BYTES;
  if (!Number.isFinite(input.byteLength) || input.byteLength <= 0) return "bad_type";
  if (input.byteLength > maxBytes) return "too_large";

  if (input.filename.includes("..")) return "bad_name";
  const name = txnImageBasename(input.filename);
  if (!name || name.length > TXN_IMAGE_MAX_FILENAME) return "bad_name";
  if (name.startsWith(".") || !FILENAME_RE.test(name)) return "bad_name";

  const dot = name.lastIndexOf(".");
  if (dot <= 0 || dot === name.length - 1) return "bad_type";
  const expected = MIME_BY_EXT[name.slice(dot + 1).toLowerCase()];
  if (!expected) return "bad_type";
  if (input.mediaType.trim().toLowerCase() !== expected) return "bad_type";
  return null;
}

export function dataUrlDecodedBytes(dataUrl: string): number | null {
  const comma = dataUrl.indexOf(",");
  if (comma < 0) return null;
  const b64 = dataUrl.slice(comma + 1).replace(/\s/g, "");
  if (!b64) return 0;
  const padding = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
  return Math.floor((b64.length * 3) / 4) - padding;
}

export function parseTxnImageDataUrl(raw: string): { mediaType: string; dataUrl: string } | null {
  const trimmed = raw.trim();
  const match = trimmed.match(/^data:(image\/(?:jpeg|png|webp));base64,[A-Za-z0-9+/]+=*$/);
  if (!match) return null;
  return { mediaType: match[1], dataUrl: trimmed };
}
