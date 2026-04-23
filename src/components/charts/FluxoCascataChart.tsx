"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface FlowRow {
  label: string;
  entradas: number;
  saidas: number;
  saldo: number;
}

interface Totals {
  entradas: number;
  saidas: number;
  saldo: number;
}

interface Props {
  rows: FlowRow[];
  totals: Totals;
  height?: number;
}

interface WaterfallStep {
  label: string;
  base: number;
  value: number;
  delta: number;
  cumulative: number;
  kind: "entrada" | "saida" | "subtotal" | "total";
  color: string;
}

function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatShortBRL(value: number) {
  const abs = Math.abs(value);

  if (abs >= 1_000_000) {
    return `R$ ${(value / 1_000_000).toFixed(1)}M`;
  }
  if (abs >= 1_000) {
    return `R$ ${(value / 1_000).toFixed(0)}k`;
  }

  return `R$ ${value.toFixed(0)}`;
}

function truncateLabel(label: string, max = 18) {
  return label.length > max ? `${label.slice(0, max - 1)}…` : label;
}

function buildWaterfallSteps(rows: FlowRow[], totals: Totals): WaterfallStep[] {
  const steps: WaterfallStep[] = [];
  let cumulative = 0;

  const entradas = rows
    .filter((row) => row.entradas > 0)
    .sort((a, b) => b.entradas - a.entradas);

  const saidas = rows
    .filter((row) => row.saidas > 0)
    .sort((a, b) => b.saidas - a.saidas);

  for (const row of entradas) {
    const start = cumulative;
    cumulative += row.entradas;
    steps.push({
      label: `Entrada • ${truncateLabel(row.label)}`,
      base: Math.min(start, cumulative),
      value: Math.abs(row.entradas),
      delta: row.entradas,
      cumulative,
      kind: "entrada",
      color: "#2563eb",
    });
  }

  if (totals.entradas !== 0) {
    steps.push({
      label: "Total entradas",
      base: Math.min(0, totals.entradas),
      value: Math.abs(totals.entradas),
      delta: totals.entradas,
      cumulative: totals.entradas,
      kind: "subtotal",
      color: "#0f172a",
    });
  }

  for (const row of saidas) {
    const start = cumulative;
    cumulative -= row.saidas;
    steps.push({
      label: `Saida • ${truncateLabel(row.label)}`,
      base: Math.min(start, cumulative),
      value: Math.abs(row.saidas),
      delta: -row.saidas,
      cumulative,
      kind: "saida",
      color: "#f97316",
    });
  }

  steps.push({
    label: "Saldo bruto",
    base: Math.min(0, totals.saldo),
    value: Math.abs(totals.saldo),
    delta: totals.saldo,
    cumulative: totals.saldo,
    kind: "total",
    color: totals.saldo >= 0 ? "#16a34a" : "#dc2626",
  });

  return steps;
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ payload: WaterfallStep }>;
  label?: string;
}) => {
  if (!active || !payload?.length) {
    return null;
  }

  const step = payload[0]?.payload;

  if (!step) {
    return null;
  }

  const deltaLabel =
    step.kind === "subtotal" || step.kind === "total" ? "Total" : "Movimento";

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: "10px",
        padding: "12px 16px",
        boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
        fontSize: "13px",
        minWidth: "220px",
      }}
    >
      <p style={{ fontWeight: "600", color: "#1e293b", marginBottom: "8px" }}>
        {label}
      </p>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "16px",
          marginBottom: "4px",
        }}
      >
        <span style={{ color: "#64748b" }}>{deltaLabel}</span>
        <span style={{ color: "#1e293b", fontWeight: "600" }}>
          {step.delta >= 0 && step.kind !== "subtotal" && step.kind !== "total"
            ? `+${formatBRL(step.delta)}`
            : formatBRL(step.delta)}
        </span>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "16px",
        }}
      >
        <span style={{ color: "#64748b" }}>Acumulado</span>
        <span style={{ color: "#1e293b" }}>{formatBRL(step.cumulative)}</span>
      </div>
    </div>
  );
};

export default function FluxoCascataChart({
  rows,
  totals,
  height = 420,
}: Props) {
  const data = buildWaterfallSteps(rows, totals);
  const bounds = data.flatMap((step) => [
    step.base,
    step.base + step.value,
    step.cumulative,
  ]);
  const minValue = Math.min(0, ...bounds);
  const maxValue = Math.max(0, ...bounds);
  const padding = Math.max((maxValue - minValue) * 0.08, 1);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        margin={{ top: 8, right: 24, left: 8, bottom: 24 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 12, fill: "#64748b" }}
          axisLine={false}
          tickLine={false}
          angle={-16}
          textAnchor="end"
          interval={0}
          height={88}
        />
        <YAxis
          tickFormatter={formatShortBRL}
          tick={{ fontSize: 12, fill: "#64748b" }}
          axisLine={false}
          tickLine={false}
          width={84}
          domain={[minValue - padding, maxValue + padding]}
        />
        <ReferenceLine y={0} stroke="#cbd5e1" />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="base" stackId="waterfall" fill="transparent" isAnimationActive={false} />
        <Bar dataKey="value" stackId="waterfall" radius={[4, 4, 0, 0]} isAnimationActive={false}>
          {data.map((entry) => (
            <Cell key={entry.label} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
