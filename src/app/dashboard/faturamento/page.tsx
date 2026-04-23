"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";

const YoYChart = dynamic(() => import("@/components/charts/YoYChart"), { ssr: false });
const TipoItemChart = dynamic(() => import("@/components/charts/TipoItemChart"), { ssr: false });
const MecanicoChart = dynamic(() => import("@/components/charts/MecanicoChart"), { ssr: false });
const AcumuladoChart = dynamic(() => import("@/components/charts/AcumuladoChart"), { ssr: false });

type Granularity = "mensal" | "semanal" | "diario";

const MESES = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"
];

function ChartCard({
  title,
  subtitle,
  children,
  loading,
  action,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  loading?: boolean;
  action?: React.ReactNode;
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
          marginBottom: "20px",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "#1e293b" }}>
            {title}
          </h2>
          {subtitle && (
            <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748b" }}>
              {subtitle}
            </p>
          )}
        </div>
        {action}
      </div>
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
          <span>Carregando dados...</span>
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
  mes,
  onMesChange,
}: {
  value: Granularity;
  onChange: (v: Granularity) => void;
  mes: number;
  onMesChange: (m: number) => void;
}) {
  const tabs: { value: Granularity; label: string }[] = [
    { value: "mensal", label: "Por Mês" },
    { value: "semanal", label: "Por Semana" },
    { value: "diario", label: "Por Dia" },
  ];
  return (
    <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
      <div style={{ display: "flex", background: "#f1f5f9", borderRadius: "8px", padding: "3px" }}>
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
      {value === "diario" && (
        <select
          value={mes}
          onChange={(e) => onMesChange(parseInt(e.target.value))}
          style={{
            padding: "6px 10px",
            border: "1px solid #e2e8f0",
            borderRadius: "6px",
            fontSize: "13px",
            color: "#374151",
            background: "#fff",
          }}
        >
          {MESES.map((m, i) => (
            <option key={i + 1} value={i + 1}>{m}</option>
          ))}
        </select>
      )}
    </div>
  );
}

export default function FaturamentoPage() {
  const searchParams = useSearchParams();
  
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), 0, 1);
  const formatDate = (d: Date) => d.toISOString().split("T")[0];

  const startDate = searchParams.get("startDate") || formatDate(firstDay);
  const endDate = searchParams.get("endDate") || formatDate(today);
  const anoAtual = new Date(startDate).getFullYear();

  const [granularity, setGranularity] = useState<Granularity>("mensal");
  const [mes, setMes] = useState(new Date().getMonth() + 1);

  const [yoyData, setYoyData] = useState<unknown[]>([]);
  const [yoyLoading, setYoyLoading] = useState(true);
  const [tipoData, setTipoData] = useState<unknown[]>([]);
  const [tipoLoading, setTipoLoading] = useState(true);
  const [mecanicoData, setMecanicoData] = useState<unknown[]>([]);
  const [mecanicoLoading, setMecanicoLoading] = useState(true);
  const [acumData, setAcumData] = useState<unknown[]>([]);
  const [acumLoading, setAcumLoading] = useState(true);

  const buildParams = useCallback(() => {
    const p = new URLSearchParams();
    p.set("startDate", startDate);
    p.set("endDate", endDate);
    if (searchParams.get("tipoItem")) p.set("tipoItem", searchParams.get("tipoItem")!);
    if (searchParams.get("mecanico")) p.set("mecanico", searchParams.get("mecanico")!);
    if (searchParams.get("area")) p.set("area", searchParams.get("area")!);
    if (searchParams.get("grupo")) p.set("grupo", searchParams.get("grupo")!);
    if (searchParams.get("subgrupo")) p.set("subgrupo", searchParams.get("subgrupo")!);
    return p;
  }, [searchParams, startDate, endDate]);

  // Fetch YoY
  useEffect(() => {
    setYoyLoading(true);
    const p = buildParams();
    p.set("granularity", granularity);
    // Note: 'mes' is only used if the API still relies on it, but we should prioritize the range.
    fetch(`/api/data/faturamento-yoy?${p}`)
      .then((r) => r.json())
      .then((d) => { setYoyData(d); setYoyLoading(false); });
  }, [granularity, buildParams]);

  // Fetch Tipo Item
  useEffect(() => {
    setTipoLoading(true);
    fetch(`/api/data/faturamento-tipo-item?${buildParams()}`)
      .then((r) => r.json())
      .then((d) => { setTipoData(d); setTipoLoading(false); });
  }, [buildParams]);

  // Fetch Mecanico
  useEffect(() => {
    setMecanicoLoading(true);
    fetch(`/api/data/faturamento-mecanico?${buildParams()}`)
      .then((r) => r.json())
      .then((d) => { setMecanicoData(d); setMecanicoLoading(false); });
  }, [buildParams]);

  // Fetch Acumulado
  useEffect(() => {
    setAcumLoading(true);
    fetch(`/api/data/faturamento-acumulado?${buildParams()}`)
      .then((r) => r.json())
      .then((d) => { setAcumData(d); setAcumLoading(false); });
  }, [buildParams]);

  const granLabel = granularity === "mensal"
    ? "mensal"
    : granularity === "semanal"
    ? "semanal"
    : `diário — ${MESES[mes - 1]}`;

  return (
    <div>
      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        {[
          {
            label: "Faturamento Atual",
            value: (yoyData as Array<{ faturamento_atual: number }>).reduce((s, r) => s + r.faturamento_atual, 0),
            year: anoAtual,
          },
          {
            label: "Faturamento Anterior",
            value: (yoyData as Array<{ faturamento_anterior: number }>).reduce((s, r) => s + r.faturamento_anterior, 0),
            year: anoAtual - 1,
          },
        ].map((kpi) => {
          const formatted = new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          }).format(kpi.value);
          return (
            <div
              key={kpi.label}
              style={{
                background: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: "12px",
                padding: "20px 24px",
              }}
            >
              <div style={{ fontSize: "12px", fontWeight: "600", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {kpi.label} ({kpi.year})
              </div>
              <div style={{ fontSize: "26px", fontWeight: "700", color: "#1e293b", marginTop: "6px" }}>
                {yoyLoading ? "..." : formatted}
              </div>
            </div>
          );
        })}
        {/* Growth KPI */}
        {!yoyLoading && (() => {
          const atual = (yoyData as Array<{ faturamento_atual: number }>).reduce((s, r) => s + r.faturamento_atual, 0);
          const ant = (yoyData as Array<{ faturamento_anterior: number }>).reduce((s, r) => s + r.faturamento_anterior, 0);
          const growth = ant > 0 ? ((atual - ant) / ant) * 100 : 0;
          return (
            <div
              style={{
                background: growth >= 0 ? "#f0fdf4" : "#fef2f2",
                border: `1px solid ${growth >= 0 ? "#bbf7d0" : "#fecaca"}`,
                borderRadius: "12px",
                padding: "20px 24px",
              }}
            >
              <div style={{ fontSize: "12px", fontWeight: "600", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Crescimento YoY
              </div>
              <div
                style={{
                  fontSize: "26px",
                  fontWeight: "700",
                  color: growth >= 0 ? "#16a34a" : "#dc2626",
                  marginTop: "6px",
                }}
              >
                {growth >= 0 ? "+" : ""}
                {growth.toFixed(1)}%
              </div>
            </div>
          );
        })()}
      </div>

      {/* YoY Chart */}
      <ChartCard
        title="Faturamento Ano a Ano"
        subtitle={`Comparativo ${anoAtual} vs ${anoAtual - 1} — visão ${granLabel}`}
        loading={yoyLoading}
        action={
          <GranularityTabs
            value={granularity}
            onChange={setGranularity}
            mes={mes}
            onMesChange={setMes}
          />
        }
      >
        <YoYChart data={yoyData as any[]} anoAtual={anoAtual} />
      </ChartCard>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
        {/* Tipo Item */}
        <ChartCard
          title="Faturamento por Tipo de Item"
          subtitle={`${anoAtual} vs ${anoAtual - 1}`}
          loading={tipoLoading}
        >
          <TipoItemChart data={tipoData as any[]} anoAtual={anoAtual} />
        </ChartCard>

        {/* Acumulado */}
        <ChartCard
          title="Faturamento Mensal Acumulado"
          subtitle={`Acumulado YoY — ${anoAtual} vs ${anoAtual - 1}`}
          loading={acumLoading}
        >
          <AcumuladoChart data={acumData as any[]} anoAtual={anoAtual} />
        </ChartCard>
      </div>

      <div style={{ marginTop: "24px" }}>
        {/* Mecanico */}
        <ChartCard
          title="Faturamento por Mecânico"
          subtitle={`Top 15 mecânicos por faturamento — ${anoAtual} vs ${anoAtual - 1}`}
          loading={mecanicoLoading}
        >
          <MecanicoChart data={mecanicoData as any[]} anoAtual={anoAtual} />
        </ChartCard>
      </div>
    </div>
  );
}

