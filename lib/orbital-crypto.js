import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

function getKey() {
  return createHash("sha256")
    .update(process.env.ORBITAL_TOKEN_SECRET || process.env.NEXTAUTH_SECRET || "dev-fallback")
    .digest();
}

export function encryptSecret(value) {
  if (!value) return null;
  const key = getKey();
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(String(value), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64url");
}

export function decryptSecret(encoded) {
  if (!encoded) return null;
  const buf = Buffer.from(encoded, "base64url");
  const iv = buf.subarray(0, 16);
  const tag = buf.subarray(16, 32);
  const encrypted = buf.subarray(32);
  const decipher = createDecipheriv("aes-256-gcm", getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
