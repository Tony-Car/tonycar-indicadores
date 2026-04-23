"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "Senha incorreta.");
        setStatus("error");
      } else {
        router.push("/dashboard/faturamento");
      }
    } catch {
      setErrorMsg("Erro de conexão. Tente novamente.");
      setStatus("error");
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f1f5f9",
        padding: "24px",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: "16px",
          padding: "48px 40px",
          width: "100%",
          maxWidth: "420px",
          boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
          border: "1px solid #e2e8f0",
        }}
      >
        {/* Logo / Header */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div
            style={{
              width: "56px",
              height: "56px",
              background: "#2563eb",
              borderRadius: "14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              fontSize: "28px",
            }}
          >
            🔧
          </div>
          <h1
            style={{
              fontSize: "22px",
              fontWeight: "700",
              color: "#1e293b",
              margin: "0 0 6px",
            }}
          >
            TonyCar Indicadores
          </h1>
          <p style={{ fontSize: "14px", color: "#64748b", margin: 0 }}>
            Painel de gestão da oficina
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "20px" }}>
            <label
              htmlFor="password"
              style={{
                display: "block",
                fontSize: "14px",
                fontWeight: "500",
                color: "#374151",
                marginBottom: "6px",
              }}
            >
              Senha de Acesso
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{
                width: "100%",
                padding: "10px 14px",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                fontSize: "15px",
                outline: "none",
                transition: "border-color 0.15s",
                color: "#1e293b",
                background: "#fff",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#2563eb")}
              onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
            />
          </div>

          {status === "error" && (
            <div
              style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "8px",
                padding: "10px 14px",
                fontSize: "14px",
                color: "#dc2626",
                marginBottom: "16px",
              }}
            >
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={status === "loading"}
            style={{
              width: "100%",
              padding: "12px",
              background: status === "loading" ? "#93c5fd" : "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              fontSize: "15px",
              fontWeight: "600",
              cursor: status === "loading" ? "not-allowed" : "pointer",
              transition: "background 0.15s",
            }}
          >
            {status === "loading" ? "Entrando..." : "Entrar no Painel"}
          </button>

          <p
            style={{
              textAlign: "center",
              fontSize: "13px",
              color: "#94a3b8",
              marginTop: "16px",
            }}
          >
            Consulte o administrador para obter a senha.
          </p>
        </form>
      </div>
    </div>
  );
}
