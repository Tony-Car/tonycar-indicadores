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
} from "recharts";

interface DataPoint {
  mecanico: string;
  faturamento: number;
  lucro: number;
  margem_pct: number;
}

interface Props {
  data: DataPoint[];
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
      {payload.map((p) => {
        const isPercent = p.name.includes("%");
        return (
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
              {isPercent ? `${p.value?.toFixed(1)}%` : formatBRL(p.value)}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default function MargemMecanicoChart({ data, height = 400 }: Props) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart
        data={data}
        margin={{ top: 8, right: 24, left: 8, bottom: 0 }}
        layout="vertical"
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
        <XAxis
          xAxisId="left"
          type="number"
          tickFormatter={formatShortBRL}
          tick={{ fontSize: 12, fill: "#64748b" }}
          axisLine={false}
          tickLine={false}
        />
        <XAxis
          xAxisId="right"
          type="number"
          orientation="top"
          tickFormatter={(v) => `${v}%`}
          tick={{ fontSize: 12, fill: "#64748b" }}
          axisLine={false}
          tickLine={false}
          hide
        />
        <YAxis
          type="category"
          dataKey="mecanico"
          tick={{ fontSize: 12, fill: "#374151" }}
          axisLine={false}
          tickLine={false}
          width={150}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: "13px", paddingTop: "12px" }}
          formatter={(value) => (
            <span style={{ color: "#475569" }}>{value}</span>
          )}
        />
        <Bar
          xAxisId="left"
          dataKey="lucro"
          name="Lucro Bruto"
          fill="#22c55e"
          radius={[0, 4, 4, 0]}
          maxBarSize={24}
        />
        <Line
          xAxisId="right"
          type="monotone"
          dataKey="margem_pct"
          name="Margem %"
          stroke="#2563eb"
          strokeWidth={2}
          dot={{ fill: "#2563eb", r: 4 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
