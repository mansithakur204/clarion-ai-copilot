import crypto from "crypto";
import { cookies } from "next/headers";
import { clarionStore } from "../store";

const SESSION_COOKIE_NAME = "clarion_session";
const JWT_SECRET = process.env.JWT_SECRET || "clarion_hackathon_super_secret_key_2026";

/**
 * Hash a plain text password using PBKDF2 with salt.
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

/**
 * Verify a plain text password against a stored PBKDF2 hash string.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash || !storedHash.includes(":")) return false;
  const [salt, originalHash] = storedHash.split(":");
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return hash === originalHash;
}

export interface UserSessionPayload {
  id: string;
  email: string;
  name: string;
  exp: number;
}

/**
 * Sign a payload object into an HMAC-SHA256 session token string.
 */
export function createSessionToken(user: { id: string; email: string; name: string }): string {
  const payload: UserSessionPayload = {
    id: user.id,
    email: user.email,
    name: user.name,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
  };
  const jsonPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(jsonPayload)
    .digest("base64url");
  return `${jsonPayload}.${signature}`;
}

/**
 * Verify and decode an HMAC-SHA256 session token string.
 */
export function verifySessionToken(token: string): UserSessionPayload | null {
  try {
    if (!token || !token.includes(".")) return null;
    const [jsonPayload, signature] = token.split(".");
    const expectedSignature = crypto
      .createHmac("sha256", JWT_SECRET)
      .update(jsonPayload)
      .digest("base64url");

    if (signature !== expectedSignature) return null;

    const payload: UserSessionPayload = JSON.parse(
      Buffer.from(jsonPayload, "base64url").toString("utf-8")
    );

    if (payload.exp && Date.now() > payload.exp) {
      return null;
    }
    return payload;
  } catch (err) {
    return null;
  }
}

/**
 * Get current authenticated user from request cookies.
 */
export async function getCurrentUser(): Promise<{ id: string; email: string; name: string } | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;

    const payload = verifySessionToken(token);
    if (!payload) return null;

    // Verify user exists in database
    const dbUser = await clarionStore.getUserById(payload.id);
    if (!dbUser) return null;

    return {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name
    };
  } catch (err) {
    return null;
  }
}

export { SESSION_COOKIE_NAME };
