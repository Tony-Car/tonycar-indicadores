import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "auth_token";
const SESSION_DURATION = 60 * 60 * 24 * 30; // 30 days in seconds

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET not set");
  return new TextEncoder().encode(secret);
}

export async function signJWT(payload: { email: string }) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getSecret());
}

export async function verifyJWT(token: string): Promise<{ email: string }> {
  const { payload } = await jwtVerify(token, getSecret());
  return { email: payload.email as string };
}

export async function getSession(): Promise<{ email: string } | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    return await verifyJWT(token);
  } catch {
    return null;
  }
}

export function createSessionCookie(token: string): string {
  const expires = new Date(Date.now() + SESSION_DURATION * 1000);
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Expires=${expires.toUTCString()}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;
}

export function clearSessionCookie(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

export function isEmailAllowed(email: string): boolean {
  const allowed = process.env.ALLOWED_EMAILS;
  if (!allowed) return false;
  const list = allowed.split(",").map((e) => e.trim().toLowerCase());
  return list.includes(email.toLowerCase());
}
