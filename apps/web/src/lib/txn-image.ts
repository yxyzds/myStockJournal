import {
  TXN_IMAGE_MAX_DECODED_BYTES,
  TXN_IMAGE_MAX_RAW_BYTES,
  dataUrlDecodedBytes,
  txnImageBasename,
  txnImageErrorMessage,
  validateTxnImageMeta,
  type TxnImageReject,
} from "@mystockjournal/shared";

const MAX_EDGE = 1280;

export type PreparedTxnImage = {
  filename: string;
  mediaType: "image/jpeg";
  image: string;
};

export function rejectTxnImageFile(file: File): TxnImageReject | null {
  return validateTxnImageMeta({
    filename: file.name,
    mediaType: file.type,
    byteLength: file.size,
    maxBytes: TXN_IMAGE_MAX_RAW_BYTES,
  });
}

export function txnImageClientMessage(code: TxnImageReject): "importTooLarge" | "importBadName" | "importBadType" {
  if (code === "too_large") return "importTooLarge";
  if (code === "bad_name") return "importBadName";
  return "importBadType";
}

function jpegFilename(filename: string) {
  const base = txnImageBasename(filename).replace(/\.[^.]+$/, "") || "screenshot";
  return `${base}.jpg`;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(txnImageErrorMessage("bad_type")));
    };
    image.src = url;
  });
}

export async function prepareTxnImage(file: File): Promise<PreparedTxnImage> {
  const rejected = rejectTxnImageFile(file);
  if (rejected) throw new Error(txnImageErrorMessage(rejected));

  const image = await loadImage(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error(txnImageErrorMessage("bad_type"));
  ctx.drawImage(image, 0, 0, width, height);

  let quality = 0.82;
  let dataUrl = canvas.toDataURL("image/jpeg", quality);
  while ((dataUrlDecodedBytes(dataUrl) ?? Infinity) > TXN_IMAGE_MAX_DECODED_BYTES && quality > 0.45) {
    quality -= 0.12;
    dataUrl = canvas.toDataURL("image/jpeg", quality);
  }
  const decoded = dataUrlDecodedBytes(dataUrl);
  if (decoded == null || decoded > TXN_IMAGE_MAX_DECODED_BYTES) {
    throw new Error(txnImageErrorMessage("too_large"));
  }

  return {
    filename: jpegFilename(file.name),
    mediaType: "image/jpeg",
    image: dataUrl,
  };
}
