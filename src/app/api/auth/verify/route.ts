import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { signJWT, createSessionCookie } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/login?error=token_missing", request.url));
  }

  try {
    const db = getDb();

    const rows = await db(
      `SELECT email, expires_at, used_at
       FROM auth.magic_tokens
       WHERE token = $1`,
      [token]
    ) as Array<{ email: string; expires_at: Date; used_at: Date | null }>;

    if (rows.length === 0) {
      return NextResponse.redirect(new URL("/login?error=token_invalid", request.url));
    }

    const { email, expires_at, used_at } = rows[0];

    if (used_at) {
      return NextResponse.redirect(new URL("/login?error=token_used", request.url));
    }

    if (new Date() > new Date(expires_at)) {
      return NextResponse.redirect(new URL("/login?error=token_expired", request.url));
    }

    // Mark token as used
    await db(
      "UPDATE auth.magic_tokens SET used_at = NOW() WHERE token = $1",
      [token]
    );

    const jwt = await signJWT({ email });
    const cookie = createSessionCookie(jwt);

    const response = NextResponse.redirect(
      new URL("/dashboard/faturamento", request.url)
    );
    response.headers.set("Set-Cookie", cookie);
    return response;
  } catch (err) {
    console.error("verify error:", err);
    return NextResponse.redirect(new URL("/login?error=server_error", request.url));
  }
}
