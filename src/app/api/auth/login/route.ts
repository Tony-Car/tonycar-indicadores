import { NextRequest, NextResponse } from "next/server";
import { signJWT, createSessionCookie, verifyPassword } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { password, email } = await request.json();

    if (!verifyPassword(password)) {
      return NextResponse.json(
        { error: "Senha incorreta." },
        { status: 401 }
      );
    }

    // Usamos o email apenas como identificador no JWT, se fornecido
    const jwt = await signJWT({ email: email || "admin@tonycar.local" });
    const cookie = createSessionCookie(jwt);

    const response = NextResponse.json({ ok: true });
    response.headers.set("Set-Cookie", cookie);
    return response;
  } catch (err) {
    console.error("login error:", err);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
