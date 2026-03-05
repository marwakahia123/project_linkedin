import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const SALT_LENGTH = 32;
const TAG_LENGTH = 16;

function getKey(secret: string, salt: Buffer): Buffer {
  return scryptSync(secret, salt, KEY_LENGTH);
}

/**
 * Chiffre une chaîne avec AES-256-GCM.
 * Retourne au format: salt (hex) + iv (hex) + tag (hex) + ciphertext (hex).
 */
export function encrypt(plainText: string, secret: string): string {
  const salt = randomBytes(SALT_LENGTH);
  const iv = randomBytes(IV_LENGTH);
  const key = getKey(secret, salt);

  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plainText, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [
    salt.toString("hex"),
    iv.toString("hex"),
    tag.toString("hex"),
    encrypted.toString("hex"),
  ].join(":");
}

/**
 * Déchiffre une chaîne produite par encrypt().
 */
export function decrypt(encryptedPayload: string, secret: string): string {
  const parts = encryptedPayload.split(":");
  if (parts.length !== 4) {
    throw new Error("Invalid encrypted payload");
  }
  const [saltHex, ivHex, tagHex, cipherHex] = parts;
  const salt = Buffer.from(saltHex, "hex");
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const key = getKey(secret, salt);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(cipherHex, "hex", "utf8") + decipher.final("utf8");
}
