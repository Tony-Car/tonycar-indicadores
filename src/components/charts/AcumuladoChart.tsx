"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface DataPoint {
  mes: number;
  label: string;
  acumulado_atual: number;
  acumulado_anterior: number;
}

interface Props {
  data: DataPoint[];
  anoAtual: number;
  height?: number;
}

function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
  }).format(value);
}

function formatShortBRL(value: number) {
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `R$ ${(value / 1_000).toFixed(0)}k`;
  return `R$ ${value.toFixed(0)}`;
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string }>;
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  const atual = payload.find((p) => p.name === "Acumulado Atual")?.value ?? 0;
  const anterior = payload.find((p) => p.name === "Acumulado Anterior")?.value ?? 0;
  const delta = atual - anterior;

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: "10px",
        padding: "12px 16px",
        boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
        fontSize: "13px",
        minWidth: "200px",
      }}
    >
      <p style={{ fontWeight: "600", color: "#1e293b", marginBottom: "8px" }}>
        {label}
      </p>
      {payload.map((p) => (
        <div
          key={p.name}
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "16px",
            marginBottom: "4px",
          }}
        >
          <span style={{ color: p.color, fontWeight: "500" }}>{p.name}</span>
          <span style={{ color: "#1e293b" }}>{formatBRL(p.value)}</span>
        </div>
      ))}
      <div
        style={{
          marginTop: "8px",
          paddingTop: "8px",
          borderTop: "1px solid #f1f5f9",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <span style={{ color: "#64748b" }}>Diferença</span>
        <span
          style={{ fontWeight: "600", color: delta >= 0 ? "#16a34a" : "#dc2626" }}
        >
          {delta >= 0 ? "+" : ""}
          {formatBRL(delta)}
        </span>
      </div>
    </div>
  );
};

export default function AcumuladoChart({ data, anoAtual, height = 340 }: Props) {
  const anoAnterior = anoAtual - 1;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart
        data={data}
        margin={{ top: 8, right: 24, left: 8, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 12, fill: "#64748b" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={formatShortBRL}
          tick={{ fontSize: 12, fill: "#64748b" }}
          axisLine={false}
          tickLine={false}
          width={70}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: "13px", paddingTop: "12px" }}
          formatter={(value) => (
            <span style={{ color: "#475569" }}>{value}</span>
          )}
        />
        <Line
          type="monotone"
          dataKey="acumulado_atual"
          name="Acumulado Atual"
          stroke="#2563eb"
          strokeWidth={2.5}
          dot={{ fill: "#2563eb", r: 4, strokeWidth: 0 }}
          activeDot={{ r: 6 }}
        />
        <Line
          type="monotone"
          dataKey="acumulado_anterior"
          name="Acumulado Anterior"
          stroke="#94a3b8"
          strokeWidth={2.5}
          strokeDasharray="5 4"
          dot={{ fill: "#94a3b8", r: 3, strokeWidth: 0 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
