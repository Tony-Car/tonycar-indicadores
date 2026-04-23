"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { formatDateRangeLabel } from "@/lib/period";
import ClientesMetricasTable from "@/components/ClientesMetricasTable";

const ClientesEvolucaoChart = dynamic(
  () => import("@/components/charts/ClientesEvolucaoChart"),
  { ssr: false }
);
const ClientesOrigemChart = dynamic(
  () => import("@/components/charts/ClientesOrigemChart"),
  { ssr: false }
);
const ClientesLtvChart = dynamic(
  () => import("@/components/charts/ClientesLtvChart"),
  { ssr: false }
);

interface Summary {
  clientes_ativos: number;
  clientes_novos: number;
  clientes_antigos: number;
  faturamento_total_periodo: number;
  ticket_medio_por_cliente_periodo: number;
  ticket_medio_geral_periodo: number;
  tempo_medio_por_cliente_dias: number;
  tempo_medio_geral_dias: number;
  ltv_medio_historico: number;
}

interface MonthlyRow {
  month: string;
  label: string;
  clientes_novos: number;
  clientes_antigos: number;
  clientes_ativos: number;
}

interface OriginRow {
  origem_cliente: string;
  clientes_ativos: number;
  faturamento_periodo: number;
  faturamento_medio_por_cliente: number;
}

interface ClientRow {
  nome_cliente: string;
  origem_cliente: string;
  total_orcamentos: number | null;
  ltv_historico: number | null;
  ticket_medio_historico: number | null;
  tempo_medio_entre_orcamentos_dias: number | null;
  faturamento_periodo: number;
  orcamentos_periodo: number;
  ticket_medio_periodo: number;
  tempo_medio_periodo_dias: number | null;
  data_primeiro_orcamento: string | null;
  data_ultimo_orcamento: string | null;
  primeiro_orcamento_periodo: string;
  ultimo_orcamento_periodo: string;
}

interface ResponsePayload {
  summary: Summary;
  monthly: MonthlyRow[];
  origins: OriginRow[];
  clients: ClientRow[];
}

function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
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
  tone?: "default" | "positive";
}) {
  const color = tone === "positive" ? "#16a34a" : "#1e293b";

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
  children,
}: {
  title: string;
  subtitle?: string;
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
      <div style={{ marginBottom: "16px" }}>
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
          <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748b" }}>
            {subtitle}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}

export default function ClientesPage() {
  const searchParams = useSearchParams();

  const today = new Date();
  const firstDay = new Date(today.getFullYear(), 0, 1);
  const formatDate = (d: Date) => d.toISOString().split("T")[0];

  const startDate = searchParams.get("startDate") || formatDate(firstDay);
  const endDate = searchParams.get("endDate") || formatDate(today);
  const selectedPeriodLabel = formatDateRangeLabel(startDate, endDate);

  const [data, setData] = useState<ResponsePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const buildParams = useCallback(() => {
    const params = new URLSearchParams();
    params.set("startDate", startDate);
    params.set("endDate", endDate);

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
  }, [searchParams, startDate, endDate]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/data/clientes-analytics?${buildParams()}`)
      .then(async (response) => {
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload?.error || "Erro ao carregar metricas de clientes");
        }

        return payload as ResponsePayload;
      })
      .then((payload: ResponsePayload) => {
        setData(payload);
      })
      .catch((err: unknown) => {
        const message =
          err instanceof Error ? err.message : "Erro ao carregar metricas de clientes";
        setData(null);
        setError(message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [buildParams]);

  const summary = data?.summary ?? {
    clientes_ativos: 0,
    clientes_novos: 0,
    clientes_antigos: 0,
    faturamento_total_periodo: 0,
    ticket_medio_por_cliente_periodo: 0,
    ticket_medio_geral_periodo: 0,
    tempo_medio_por_cliente_dias: 0,
    tempo_medio_geral_dias: 0,
    ltv_medio_historico: 0,
  };

  const topClientsByLtv = useMemo(
    () =>
      [...(data?.clients ?? [])]
        .filter((client) => client.ltv_historico !== null)
        .sort(
          (a, b) =>
            (b.ltv_historico ?? 0) - (a.ltv_historico ?? 0)
        )
        .slice(0, 12),
    [data?.clients]
  );

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
          Avaliacao de clientes
        </h1>
        <p style={{ fontSize: "14px", color: "#64748b", margin: 0 }}>
          Analise de origem, recorrencia, LTV, ticket medio e intervalo entre
          orcamentos no periodo {selectedPeriodLabel}. Os filtros globais do
          dashboard continuam valendo aqui.
        </p>
      </div>

      {error && (
        <div
          style={{
            marginBottom: "24px",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "12px",
            padding: "16px 18px",
            color: "#991b1b",
            fontSize: "14px",
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        <OverviewCard
          label="Clientes ativos"
          helper="Com orcamentos no periodo"
          value={loading ? "..." : summary.clientes_ativos.toLocaleString("pt-BR")}
        />
        <OverviewCard
          label="Clientes novos"
          helper="Primeiro orcamento no periodo"
          value={loading ? "..." : summary.clientes_novos.toLocaleString("pt-BR")}
          tone="positive"
        />
        <OverviewCard
          label="Clientes antigos"
          helper="Ja tinham historico anterior"
          value={loading ? "..." : summary.clientes_antigos.toLocaleString("pt-BR")}
        />
        <OverviewCard
          label="Ticket medio geral"
          helper="Faturamento total / orcamentos do periodo"
          value={loading ? "..." : formatBRL(summary.ticket_medio_geral_periodo)}
        />
        <OverviewCard
          label="Tempo medio geral"
          helper="Dias entre orcamentos"
          value={loading ? "..." : `${summary.tempo_medio_geral_dias.toFixed(1)} dias`}
        />
        <OverviewCard
          label="LTV medio historico"
          helper="Media do valor acumulado por cliente"
          value={loading ? "..." : formatBRL(summary.ltv_medio_historico)}
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "24px",
          marginBottom: "24px",
        }}
      >
        <ChartCard
          title="Clientes novos e antigos por mes"
          subtitle="Clientes novos contam no mes do primeiro orcamento; antigos sao os recorrentes ativos em cada mes."
        >
          {loading ? (
            <div
              style={{
                height: "320px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#94a3b8",
                fontSize: "14px",
              }}
            >
              Carregando evolucao...
            </div>
          ) : (
            <ClientesEvolucaoChart data={data?.monthly ?? []} />
          )}
        </ChartCard>

        <ChartCard
          title="Origem dos clientes"
          subtitle="Distribuicao de clientes ativos no periodo por origem de cadastro."
        >
          {loading ? (
            <div
              style={{
                height: "320px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#94a3b8",
                fontSize: "14px",
              }}
            >
              Carregando origens...
            </div>
          ) : (
            <ClientesOrigemChart data={data?.origins ?? []} />
          )}
        </ChartCard>
      </div>

      <div style={{ marginBottom: "24px" }}>
        <ChartCard
          title="Top clientes por LTV historico"
          subtitle="Clientes ativos no periodo ordenados pelo valor acumulado de toda a relacao."
        >
          {loading ? (
            <div
              style={{
                height: "360px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#94a3b8",
                fontSize: "14px",
              }}
            >
              Carregando LTV...
            </div>
          ) : (
            <ClientesLtvChart data={topClientsByLtv} />
          )}
        </ChartCard>
      </div>

      <ChartCard
        title="Metricas por cliente"
        subtitle="Tabela com comparativo do periodo e historico consolidado por cliente."
      >
        <ClientesMetricasTable data={data?.clients ?? []} loading={loading} />
      </ChartCard>
    </div>
  );
}
