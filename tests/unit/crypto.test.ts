import { describe, it, expect } from "vitest";
import {
  encryptField,
  decryptField,
  generateKey,
  loadKey,
  CryptoError,
} from "@/lib/crypto";

const key = loadKey(generateKey());

describe("encryptField / decryptField (AES-256-GCM)", () => {
  it("round-trip: decifra ciò che ha cifrato", () => {
    const secret = "token-bancario-super-segreto-€";
    const enc = encryptField(secret, key);
    expect(enc).not.toContain(secret);
    expect(decryptField(enc, key)).toBe(secret);
  });

  it("produce ciphertext diverso ad ogni cifratura (IV casuale)", () => {
    const a = encryptField("stesso", key);
    const b = encryptField("stesso", key);
    expect(a).not.toBe(b);
    expect(decryptField(a, key)).toBe("stesso");
    expect(decryptField(b, key)).toBe("stesso");
  });

  it("rileva manomissione del ciphertext (authTag)", () => {
    const enc = encryptField("integro", key);
    const parts = enc.split(":");
    // Altera l'ultimo byte del ciphertext.
    const tampered = Buffer.from(parts[4]!, "base64");
    tampered[0] = tampered[0]! ^ 0xff;
    parts[4] = tampered.toString("base64");
    expect(() => decryptField(parts.join(":"), key)).toThrow(CryptoError);
  });

  it("fallisce con chiave errata", () => {
    const enc = encryptField("segreto", key);
    const otherKey = loadKey(generateKey());
    expect(() => decryptField(enc, otherKey)).toThrow(CryptoError);
  });

  it("supporta un resolver di chiave per keyId (rotazione)", () => {
    const enc = encryptField("rotabile", key, "k2024");
    const resolved = decryptField(enc, (keyId) => {
      expect(keyId).toBe("k2024");
      return key;
    });
    expect(resolved).toBe("rotabile");
  });
});

describe("loadKey()", () => {
  it("rifiuta chiavi di lunghezza errata", () => {
    expect(() => loadKey(Buffer.from("corta").toString("base64"))).toThrow(
      CryptoError,
    );
  });

  it("rifiuta chiave vuota", () => {
    expect(() => loadKey("")).toThrow(CryptoError);
  });
});
