"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { formatDateRangeLabel } from "@/lib/period";

const FluxoCascataChart = dynamic(
  () => import("@/components/charts/FluxoCascataChart"),
  { ssr: false }
);

type GroupBy = "tipo_item" | "area" | "grupo" | "subgrupo" | "mecanico";

interface FlowRow {
  label: string;
  entradas: number;
  saidas: number;
  saldo: number;
}

interface FlowResponse {
  groupBy: GroupBy;
  groupLabel: string;
  rows: FlowRow[];
  totals: {
    entradas: number;
    saidas: number;
    saldo: number;
  };
}

const GROUP_OPTIONS: Array<{ value: GroupBy; label: string }> = [
  { value: "tipo_item", label: "Tipo de item" },
  { value: "area", label: "Area" },
  { value: "grupo", label: "Grupo" },
  { value: "subgrupo", label: "Subgrupo" },
  { value: "mecanico", label: "Mecanico" },
];

function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function compactRows(rows: FlowRow[], limit = 5) {
  const sorted = [...rows].sort(
    (a, b) =>
      Math.max(b.entradas, b.saidas, Math.abs(b.saldo)) -
      Math.max(a.entradas, a.saidas, Math.abs(a.saldo))
  );

  if (sorted.length <= limit) {
    return sorted;
  }

  const visible = sorted.slice(0, limit);
  const remaining = sorted.slice(limit);
  const others = remaining.reduce(
    (acc, row) => ({
      label: "Outros",
      entradas: acc.entradas + row.entradas,
      saidas: acc.saidas + row.saidas,
      saldo: acc.saldo + row.saldo,
    }),
    { label: "Outros", entradas: 0, saidas: 0, saldo: 0 }
  );

  if (others.entradas !== 0 || others.saidas !== 0 || others.saldo !== 0) {
    visible.push(others);
  }

  return visible;
}

function OverviewCard({
  label,
  value,
  helper,
  tone = "default",
}: {
  label: string;
  value: string;
  helper?: string;
  tone?: "default" | "positive" | "negative";
}) {
  const color =
    tone === "positive" ? "#16a34a" : tone === "negative" ? "#dc2626" : "#1e293b";

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: "12px",
        padding: "20px 24px",
      }}
    >
      <div
        style={{
          fontSize: "12px",
          fontWeight: "600",
          color: "#64748b",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        {label}
      </div>
      {helper && (
        <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>
          {helper}
        </div>
      )}
      <div
        style={{
          fontSize: "26px",
          fontWeight: "700",
          color,
          marginTop: "8px",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  action,
  notice,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  notice?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: "12px",
        padding: "24px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: "12px",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: "16px",
              fontWeight: "700",
              color: "#1e293b",
            }}
          >
            {title}
          </h2>
          {subtitle && (
            <p
              style={{
                margin: "4px 0 0",
                fontSize: "13px",
                color: "#64748b",
              }}
            >
              {subtitle}
            </p>
          )}
        </div>
        {action}
      </div>
      {notice && (
        <div
          style={{
            background: "#fffbeb",
            border: "1px solid #fde68a",
            borderRadius: "6px",
            padding: "8px 12px",
            fontSize: "12px",
            color: "#92400e",
            marginBottom: "16px",
          }}
        >
          {notice}
        </div>
      )}
      {children}
    </div>
  );
}

export default function ComposicaoPage() {
  const searchParams = useSearchParams();

  const today = new Date();
  const firstDay = new Date(today.getFullYear(), 0, 1);
  const formatDate = (d: Date) => d.toISOString().split("T")[0];

  const startDate = searchParams.get("startDate") || formatDate(firstDay);
  const endDate = searchParams.get("endDate") || formatDate(today);
  const selectedPeriodLabel = formatDateRangeLabel(startDate, endDate);

  const [groupBy, setGroupBy] = useState<GroupBy>("tipo_item");
  const [data, setData] = useState<FlowResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const buildParams = useCallback(() => {
    const params = new URLSearchParams();
    params.set("startDate", startDate);
    params.set("endDate", endDate);
    params.set("groupBy", groupBy);

    if (searchParams.get("tipoItem")) {
      params.set("tipoItem", searchParams.get("tipoItem")!);
    }
    if (searchParams.get("mecanico")) {
      params.set("mecanico", searchParams.get("mecanico")!);
    }
    if (searchParams.get("area")) {
      params.set("area", searchParams.get("area")!);
    }
    if (searchParams.get("grupo")) {
      params.set("grupo", searchParams.get("grupo")!);
    }
    if (searchParams.get("subgrupo")) {
      params.set("subgrupo", searchParams.get("subgrupo")!);
    }

    return params;
  }, [searchParams, startDate, endDate, groupBy]);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/data/composicao-cascata?${buildParams()}`)
      .then((response) => response.json())
      .then((payload: FlowResponse) => {
        setData(payload);
        setLoading(false);
      });
  }, [buildParams]);

  const compactedRows = compactRows(data?.rows ?? []);
  const totals = data?.totals ?? { entradas: 0, saidas: 0, saldo: 0 };
  const margin =
    totals.entradas > 0 ? (totals.saldo / totals.entradas) * 100 : 0;

  return (
    <div>
      <div style={{ marginBottom: "24px" }}>
        <h1
          style={{
            fontSize: "22px",
            fontWeight: "700",
            color: "#1e293b",
            margin: "0 0 4px",
          }}
        >
          Composicao de entradas e saidas
        </h1>
        <p style={{ fontSize: "14px", color: "#64748b", margin: 0 }}>
          Leitura em cascata do periodo {selectedPeriodLabel}. Entradas usam o
          faturamento, saidas usam o custo atualizado e o saldo final representa
          o lucro bruto.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        <OverviewCard
          label="Entradas"
          helper="Faturamento bruto do periodo"
          value={loading ? "..." : formatBRL(totals.entradas)}
        />
        <OverviewCard
          label="Saidas"
          helper="Custos com base atualizada"
          value={loading ? "..." : formatBRL(totals.saidas)}
          tone="negative"
        />
        <OverviewCard
          label="Saldo bruto"
          helper="Entradas menos saidas"
          value={loading ? "..." : formatBRL(totals.saldo)}
          tone={totals.saldo >= 0 ? "positive" : "negative"}
        />
        <OverviewCard
          label="Margem"
          helper="Saldo dividido pelas entradas"
          value={loading ? "..." : `${margin.toFixed(1)}%`}
          tone={margin >= 0 ? "positive" : "negative"}
        />
      </div>

      <ChartCard
        title="Grafico de cascata"
        subtitle={
          data
            ? `Agrupado por ${data.groupLabel.toLowerCase()} • exibindo os maiores movimentos`
            : "Agrupando os movimentos do periodo selecionado"
        }
        notice="Saidas dependem apenas de itens com flag_custos_atualizados = true. Periodos anteriores a junho/2025 podem ter cobertura parcial ou nula."
        action={
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <span style={{ fontSize: "12px", color: "#64748b" }}>Agrupar por</span>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as GroupBy)}
              style={{
                padding: "8px 10px",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                fontSize: "13px",
                color: "#374151",
                background: "#fff",
              }}
            >
              {GROUP_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        }
      >
        {loading ? (
          <div
            style={{
              height: "420px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#94a3b8",
              fontSize: "14px",
            }}
          >
            Carregando composicao...
          </div>
        ) : !data || data.rows.length === 0 ? (
          <div
            style={{
              height: "320px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#94a3b8",
              fontSize: "14px",
              textAlign: "center",
              padding: "0 24px",
            }}
          >
            Nenhum dado com entradas e saidas disponiveis para o periodo e
            filtros selecionados.
          </div>
        ) : (
          <>
            <div
              style={{
                display: "flex",
                gap: "16px",
                flexWrap: "wrap",
                marginBottom: "12px",
                fontSize: "12px",
                color: "#64748b",
              }}
            >
              <span>Azul: entradas</span>
              <span>Laranja: saidas</span>
              <span>Verde/Vermelho: saldo final</span>
              <span>Preto: subtotal de entradas</span>
            </div>
            <FluxoCascataChart rows={compactedRows} totals={totals} />
          </>
        )}
      </ChartCard>
    </div>
  );
}
