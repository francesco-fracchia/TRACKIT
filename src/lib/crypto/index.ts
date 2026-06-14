import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";

/**
 * Cifratura at-rest per campi sensibili (es. token di connessioni bancarie, M8).
 *
 * Algoritmo: AES-256-GCM (cifratura autenticata: garantisce riservatezza E
 * integrità). Ogni record usa un IV casuale; il tag di autenticazione è salvato
 * insieme al ciphertext.
 *
 * Formato serializzato (stringa, sicura per DB di testo):
 *   v1:<keyId>:<iv b64>:<authTag b64>:<ciphertext b64>
 * Il prefisso di versione + keyId abilita la rotazione della chiave in futuro
 * senza dover ri-cifrare tutto in un colpo solo.
 */

const ALGO = "aes-256-gcm";
const IV_BYTES = 12; // raccomandato per GCM
const KEY_BYTES = 32; // AES-256
const VERSION = "v1";
const DEFAULT_KEY_ID = "default";

export class CryptoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CryptoError";
  }
}

/** Decodifica la chiave base64 e ne verifica la lunghezza (32 byte). */
export function loadKey(base64Key: string): Buffer {
  if (!base64Key) {
    throw new CryptoError("ENCRYPTION_KEY mancante");
  }
  const key = Buffer.from(base64Key, "base64");
  if (key.length !== KEY_BYTES) {
    throw new CryptoError(
      `ENCRYPTION_KEY deve essere 32 byte in base64 (trovati ${key.length})`,
    );
  }
  return key;
}

/** Cifra `plaintext` e restituisce la stringa serializzata. */
export function encryptField(
  plaintext: string,
  key: Buffer,
  keyId = DEFAULT_KEY_ID,
): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return [
    VERSION,
    keyId,
    iv.toString("base64"),
    authTag.toString("base64"),
    ciphertext.toString("base64"),
  ].join(":");
}

/**
 * Decifra una stringa serializzata da `encryptField`. Lancia se il tag di
 * autenticazione non combacia (dato manomesso o chiave errata).
 *
 * `keyResolver` permette la rotazione: riceve il keyId e restituisce la chiave.
 * Se è passata una `Buffer`, viene usata per qualsiasi keyId.
 */
export function decryptField(
  serialized: string,
  keyOrResolver: Buffer | ((keyId: string) => Buffer),
): string {
  const parts = serialized.split(":");
  if (parts.length !== 5) {
    throw new CryptoError("Formato cifrato non valido");
  }
  const [version, keyId, ivB64, tagB64, dataB64] = parts as [
    string,
    string,
    string,
    string,
    string,
  ];
  if (version !== VERSION) {
    throw new CryptoError(`Versione cifratura non supportata: ${version}`);
  }
  const key =
    typeof keyOrResolver === "function" ? keyOrResolver(keyId) : keyOrResolver;

  const decipher = createDecipheriv(ALGO, key, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  try {
    return Buffer.concat([
      decipher.update(Buffer.from(dataB64, "base64")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    throw new CryptoError(
      "Decifratura fallita: dato manomesso o chiave errata",
    );
  }
}

/** Genera una chiave AES-256 casuale in base64 (utility per setup/rotazione). */
export function generateKey(): string {
  return randomBytes(KEY_BYTES).toString("base64");
}
