"use client";

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface DataPoint {
  label: string;
  faturamento_atual: number;
  faturamento_anterior: number;
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
    maximumFractionDigits: 0,
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

  const atual = payload.find((p) => p.name === "Ano Atual")?.value ?? 0;
  const anterior = payload.find((p) => p.name === "Ano Anterior")?.value ?? 0;
  const crescimento = anterior > 0 ? ((atual - anterior) / anterior) * 100 : null;

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
          <span style={{ color: "#1e293b" }}>
            {typeof p.value === "number" && p.name !== "Crescimento %"
              ? formatBRL(p.value)
              : `${p.value?.toFixed(1)}%`}
          </span>
        </div>
      ))}
      {crescimento !== null && (
        <div
          style={{
            marginTop: "8px",
            paddingTop: "8px",
            borderTop: "1px solid #f1f5f9",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span style={{ color: "#64748b" }}>Crescimento</span>
          <span
            style={{
              fontWeight: "600",
              color: crescimento >= 0 ? "#16a34a" : "#dc2626",
            }}
          >
            {crescimento >= 0 ? "+" : ""}
            {crescimento.toFixed(1)}%
          </span>
        </div>
      )}
    </div>
  );
};

export default function YoYChart({ data, anoAtual, height = 340 }: Props) {
  const anoAnterior = anoAtual - 1;

  const enriched = data.map((d) => ({
    ...d,
    crescimento:
      d.faturamento_anterior > 0
        ? ((d.faturamento_atual - d.faturamento_anterior) /
            d.faturamento_anterior) *
          100
        : null,
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart
        data={enriched}
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
          yAxisId="left"
          tickFormatter={formatShortBRL}
          tick={{ fontSize: 12, fill: "#64748b" }}
          axisLine={false}
          tickLine={false}
          width={70}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          tickFormatter={(v) => `${v.toFixed(0)}%`}
          tick={{ fontSize: 12, fill: "#64748b" }}
          axisLine={false}
          tickLine={false}
          width={50}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: "13px", paddingTop: "12px" }}
          formatter={(value) => (
            <span style={{ color: "#475569" }}>{value}</span>
          )}
        />
        <ReferenceLine yAxisId="right" y={0} stroke="#e2e8f0" />
        <Bar
          yAxisId="left"
          dataKey="faturamento_atual"
          name="Ano Atual"
          fill="#2563eb"
          radius={[4, 4, 0, 0]}
          maxBarSize={48}
        />
        <Bar
          yAxisId="left"
          dataKey="faturamento_anterior"
          name="Ano Anterior"
          fill="#cbd5e1"
          radius={[4, 4, 0, 0]}
          maxBarSize={48}
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="crescimento"
          name="Crescimento %"
          stroke="#f59e0b"
          strokeWidth={2.5}
          dot={{ fill: "#f59e0b", r: 4, strokeWidth: 0 }}
          activeDot={{ r: 6 }}
          connectNulls={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
