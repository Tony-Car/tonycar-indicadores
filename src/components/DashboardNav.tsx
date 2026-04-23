"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/dashboard/faturamento", label: "Faturamento" },
  { href: "/dashboard/margem", label: "Margem" },
  { href: "/dashboard/clientes", label: "Clientes" },
  { href: "/dashboard/composicao", label: "Composicao" },
  { href: "/dashboard/detalhamento", label: "Detalhamento" },
  { href: "/dashboard/categorias", label: "Categorias" },
];

interface Props {
  userEmail?: string;
}

export default function DashboardNav({ userEmail }: Props) {
  const pathname = usePathname();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <header
      style={{
        background: "#fff",
        borderBottom: "1px solid #e2e8f0",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      {/* Top bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
          height: "56px",
          maxWidth: "1400px",
          margin: "0 auto",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "22px" }}>🔧</span>
          <span
            style={{ fontSize: "16px", fontWeight: "700", color: "#1e293b" }}
          >
            TonyCar Indicadores
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          {userEmail && (
            <span style={{ fontSize: "13px", color: "#64748b" }}>
              {userEmail}
            </span>
          )}
          <button
            onClick={handleLogout}
            style={{
              background: "none",
              border: "1px solid #e2e8f0",
              borderRadius: "6px",
              padding: "6px 12px",
              fontSize: "13px",
              color: "#64748b",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "#dc2626";
              e.currentTarget.style.color = "#dc2626";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "#e2e8f0";
              e.currentTarget.style.color = "#64748b";
            }}
          >
            Sair
          </button>
        </div>
      </div>

      {/* Tab navigation */}
      <div
        style={{
          display: "flex",
          padding: "0 24px",
          maxWidth: "1400px",
          margin: "0 auto",
          gap: "4px",
        }}
      >
        {tabs.map((tab) => {
          const active = pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              style={{
                padding: "10px 20px",
                fontSize: "14px",
                fontWeight: active ? "600" : "400",
                color: active ? "#2563eb" : "#64748b",
                borderBottom: active ? "2px solid #2563eb" : "2px solid transparent",
                textDecoration: "none",
                transition: "all 0.15s",
                whiteSpace: "nowrap",
              }}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </header>
  );
}
