import { describe, expect, it } from "vitest";
import {
  TXN_IMAGE_MAX_DECODED_BYTES,
  TXN_IMAGE_MAX_RAW_BYTES,
  dataUrlDecodedBytes,
  parseTxnImageDataUrl,
  txnImageBasename,
  validateTxnImageMeta,
} from "./txn-extract";

describe("txn image validation", () => {
  it("accepts a normal screenshot name and jpeg type", () => {
    expect(
      validateTxnImageMeta({
        filename: "IMG_1234.JPG",
        mediaType: "image/jpeg",
        byteLength: 1_200_000,
      }),
    ).toBeNull();
  });

  it("strips path segments before checking the name", () => {
    expect(txnImageBasename("C:\\\\Users\\\\me\\\\shot.png")).toBe("shot.png");
    expect(
      validateTxnImageMeta({
        filename: "folder/shot.png",
        mediaType: "image/png",
        byteLength: 800,
      }),
    ).toBeNull();
  });

  it("rejects traversal, empty, and non-ascii names", () => {
    expect(validateTxnImageMeta({ filename: "../x.jpg", mediaType: "image/jpeg", byteLength: 10 })).toBe(
      "bad_name",
    );
    expect(validateTxnImageMeta({ filename: ".hidden.jpg", mediaType: "image/jpeg", byteLength: 10 })).toBe(
      "bad_name",
    );
    expect(validateTxnImageMeta({ filename: "截屏.png", mediaType: "image/png", byteLength: 10 })).toBe(
      "bad_name",
    );
  });

  it("rejects the wrong extension or mime", () => {
    expect(validateTxnImageMeta({ filename: "shot.heic", mediaType: "image/heic", byteLength: 10 })).toBe(
      "bad_type",
    );
    expect(validateTxnImageMeta({ filename: "shot.png", mediaType: "image/jpeg", byteLength: 10 })).toBe(
      "bad_type",
    );
  });

  it("rejects oversized files", () => {
    expect(
      validateTxnImageMeta({
        filename: "shot.jpg",
        mediaType: "image/jpeg",
        byteLength: TXN_IMAGE_MAX_RAW_BYTES + 1,
      }),
    ).toBe("too_large");
    expect(
      validateTxnImageMeta({
        filename: "shot.jpg",
        mediaType: "image/jpeg",
        byteLength: TXN_IMAGE_MAX_DECODED_BYTES + 1,
        maxBytes: TXN_IMAGE_MAX_DECODED_BYTES,
      }),
    ).toBe("too_large");
  });

  it("parses a jpeg data URL and estimates decoded bytes", () => {
    const dataUrl = "data:image/jpeg;base64,aGVsbG8=";
    expect(parseTxnImageDataUrl(dataUrl)?.mediaType).toBe("image/jpeg");
    expect(dataUrlDecodedBytes(dataUrl)).toBe(5);
    expect(parseTxnImageDataUrl("data:text/plain;base64,aGVsbG8=")).toBeNull();
  });
});
