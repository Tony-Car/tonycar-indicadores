import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { isEmailAllowed } from "@/lib/auth";
import { Resend } from "resend";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "E-mail inválido." }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!isEmailAllowed(normalizedEmail)) {
      return NextResponse.json(
        { error: "E-mail não autorizado." },
        { status: 403 }
      );
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    const db = getDb();
    await db(
      "INSERT INTO auth.magic_tokens (email, token, expires_at) VALUES ($1, $2, $3)",
      [normalizedEmail, token, expiresAt.toISOString()]
    );

    const appUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const magicLink = `${appUrl}/api/auth/verify?token=${token}`;

    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: process.env.EMAIL_FROM || "TonyCar <noreply@tonycar.com.br>",
        to: normalizedEmail,
        subject: "Seu link de acesso — TonyCar Indicadores",
        html: `
          <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto;">
            <h2 style="color: #1e293b;">🔧 TonyCar Indicadores</h2>
            <p style="color: #374151; font-size: 16px;">
              Clique no botão abaixo para acessar o painel de indicadores.
              O link é válido por <strong>15 minutos</strong>.
            </p>
            <a href="${magicLink}"
               style="display: inline-block; background: #2563eb; color: white;
                      padding: 14px 28px; border-radius: 8px; text-decoration: none;
                      font-weight: 600; font-size: 15px; margin: 16px 0;">
              Acessar painel
            </a>
            <p style="color: #94a3b8; font-size: 13px;">
              Se você não solicitou esse link, ignore este e-mail.
            </p>
          </div>
        `,
      });
    } else {
      // Development: log to console
      console.log(`\n🔗 Magic link para ${normalizedEmail}:\n${magicLink}\n`);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("send-link error:", err);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
