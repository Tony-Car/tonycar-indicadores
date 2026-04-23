"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { formatDateRangeLabel, getPreviousYearRange } from "@/lib/period";

const MargemYoYChart = dynamic(
  () => import("@/components/charts/MargemYoYChart"),
  { ssr: false }
);
const MargemTipoItemChart = dynamic(
  () => import("@/components/charts/MargemTipoItemChart"),
  { ssr: false }
);
const MargemMecanicoChart = dynamic(
  () => import("@/components/charts/MargemMecanicoChart"),
  { ssr: false }
);

type Granularity = "mensal" | "semanal";

function ChartCard({
  title,
  subtitle,
  children,
  loading,
  action,
  notice,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  loading?: boolean;
  action?: React.ReactNode;
  notice?: string;
}) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: "12px",
        padding: "24px",
        marginBottom: "24px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: "8px",
          flexWrap: "wrap",
          gap: "12px",
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
      {loading ? (
        <div
          style={{
            height: "300px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#94a3b8",
            fontSize: "14px",
          }}
        >
          Carregando dados...
        </div>
      ) : (
        children
      )}
    </div>
  );
}

function GranularityTabs({
  value,
  onChange,
}: {
  value: Granularity;
  onChange: (v: Granularity) => void;
}) {
  const tabs: { value: Granularity; label: string }[] = [
    { value: "mensal", label: "Mensal" },
    { value: "semanal", label: "Semanal" },
  ];

  return (
    <div
      style={{
        display: "flex",
        background: "#f1f5f9",
        borderRadius: "8px",
        padding: "3px",
      }}
    >
      {tabs.map((t) => (
        <button
          key={t.value}
          onClick={() => onChange(t.value)}
          style={{
            padding: "6px 14px",
            border: "none",
            borderRadius: "6px",
            fontSize: "13px",
            fontWeight: "500",
            cursor: "pointer",
            background: value === t.value ? "#fff" : "transparent",
            color: value === t.value ? "#2563eb" : "#64748b",
            boxShadow: value === t.value ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
            transition: "all 0.15s",
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export default function MargemPage() {
  const searchParams = useSearchParams();

  const today = new Date();
  const firstDay = new Date(today.getFullYear(), 0, 1);
  const formatDate = (d: Date) => d.toISOString().split("T")[0];

  const startDate = searchParams.get("startDate") || formatDate(firstDay);
  const endDate = searchParams.get("endDate") || formatDate(today);
  const comparisonRange = getPreviousYearRange(startDate, endDate);
  const selectedPeriodLabel = formatDateRangeLabel(startDate, endDate);
  const comparisonPeriodLabel = formatDateRangeLabel(
    comparisonRange.startDate,
    comparisonRange.endDate
  );

  const [granularity, setGranularity] = useState<Granularity>("mensal");
  const [yoyData, setYoyData] = useState<unknown[]>([]);
  const [yoyLoading, setYoyLoading] = useState(true);
  const [yoyError, setYoyError] = useState<string | null>(null);
  const [tipoData, setTipoData] = useState<unknown[]>([]);
  const [tipoLoading, setTipoLoading] = useState(true);
  const [mecanicoData, setMecanicoData] = useState<unknown[]>([]);
  const [mecanicoLoading, setMecanicoLoading] = useState(true);

  const buildParams = useCallback(() => {
    const p = new URLSearchParams();
    p.set("startDate", startDate);
    p.set("endDate", endDate);
    if (searchParams.get("tipoItem")) {
      p.set("tipoItem", searchParams.get("tipoItem")!);
    }
    if (searchParams.get("mecanico")) {
      p.set("mecanico", searchParams.get("mecanico")!);
    }
    if (searchParams.get("area")) {
      p.set("area", searchParams.get("area")!);
    }
    if (searchParams.get("grupo")) {
      p.set("grupo", searchParams.get("grupo")!);
    }
    if (searchParams.get("subgrupo")) {
      p.set("subgrupo", searchParams.get("subgrupo")!);
    }
    return p;
  }, [searchParams, startDate, endDate]);

  useEffect(() => {
    setYoyLoading(true);
    setYoyError(null);
    const p = buildParams();
    p.set("granularity", granularity);
    fetch(`/api/data/margem-yoy?${p}`)
      .then(async (response) => {
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload?.error || "Erro ao carregar margem por periodo");
        }

        return Array.isArray(payload) ? payload : [];
      })
      .then((payload) => {
        setYoyData(payload);
      })
      .catch((err: unknown) => {
        setYoyData([]);
        setYoyError(
          err instanceof Error
            ? err.message
            : "Erro ao carregar margem por periodo"
        );
      })
      .finally(() => {
        setYoyLoading(false);
      });
  }, [granularity, buildParams]);

  useEffect(() => {
    setTipoLoading(true);
    fetch(`/api/data/margem-tipo-item?${buildParams()}`)
      .then((r) => r.json())
      .then((d) => {
        setTipoData(d);
        setTipoLoading(false);
      });
  }, [buildParams]);

  useEffect(() => {
    setMecanicoLoading(true);
    fetch(`/api/data/margem-mecanico?${buildParams()}`)
      .then((r) => r.json())
      .then((d) => {
        setMecanicoData(d);
        setMecanicoLoading(false);
      });
  }, [buildParams]);

  type MargemRow = { faturamento_atual: number; lucro_atual: number };
  const yoyRows = Array.isArray(yoyData) ? (yoyData as MargemRow[]) : [];

  const totalFat = yoyRows.reduce(
    (sum, row) => sum + row.faturamento_atual,
    0
  );
  const totalLucro = yoyRows.reduce(
    (sum, row) => sum + row.lucro_atual,
    0
  );
  const margemMedia = totalFat > 0 ? (totalLucro / totalFat) * 100 : 0;

  const fmt = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
    }).format(value);

  return (
    <div>
      {yoyError && (
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
          {yoyError}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        {[
          { label: "Faturamento", value: fmt(totalFat), color: "#1e293b", bg: "#fff" },
          {
            label: "Lucro bruto",
            value: fmt(totalLucro),
            color: "#16a34a",
            bg: "#f0fdf4",
          },
          {
            label: "Margem bruta",
            value: `${margemMedia.toFixed(1)}%`,
            color: margemMedia >= 0 ? "#16a34a" : "#dc2626",
            bg: margemMedia >= 0 ? "#f0fdf4" : "#fef2f2",
          },
        ].map((kpi) => (
          <div
            key={kpi.label}
            style={{
              background: kpi.bg,
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
              {kpi.label}
            </div>
            <div
              style={{
                fontSize: "12px",
                color: "#94a3b8",
                marginTop: "4px",
              }}
            >
              {selectedPeriodLabel}
            </div>
            <div
              style={{
                fontSize: "26px",
                fontWeight: "700",
                color: kpi.color,
                marginTop: "8px",
              }}
            >
              {yoyLoading ? "..." : kpi.value}
            </div>
          </div>
        ))}
      </div>

      <ChartCard
        title="Margem bruta por periodo"
        subtitle={`Comparativo ${selectedPeriodLabel} vs ${comparisonPeriodLabel}`}
        loading={yoyLoading}
        notice="Dados de custo disponiveis apenas a partir de junho/2025 (flag_custos_atualizados)"
        action={<GranularityTabs value={granularity} onChange={setGranularity} />}
      >
        <MargemYoYChart data={yoyRows as any[]} />
      </ChartCard>

      <ChartCard
        title="Margem bruta por tipo de item"
        subtitle={`Periodo selecionado: ${selectedPeriodLabel}`}
        loading={tipoLoading}
        notice="Dados de custo disponiveis apenas a partir de junho/2025 (flag_custos_atualizados)"
      >
        <MargemTipoItemChart data={tipoData as any[]} height={320} />
      </ChartCard>

      <ChartCard
        title="Produtividade e margem por mecanico"
        subtitle={`Periodo selecionado: ${selectedPeriodLabel}`}
        loading={mecanicoLoading}
        notice="Dados de custo disponiveis apenas a partir de junho/2025 (flag_custos_atualizados)"
      >
        <MargemMecanicoChart data={mecanicoData as any[]} height={400} />
      </ChartCard>
    </div>
  );
}
