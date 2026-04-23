import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = process.env.JWT_SECRET;

// No Next.js 16, a função deve se chamar 'proxy' ou ser o export default
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protege apenas as rotas que começam com /dashboard
  if (pathname.startsWith("/dashboard")) {
    const token = request.cookies.get("auth_token")?.value;

    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    try {
      const secret = new TextEncoder().encode(JWT_SECRET);
      await jwtVerify(token, secret);
      return NextResponse.next();
    } catch (err) {
      console.error("Proxy auth error:", err);
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return NextResponse.next();
}

// Configuração de compatibilidade para garantir que o Next.js intercepte as rotas corretas
export const config = {
  matcher: ["/dashboard/:path*"],
};
