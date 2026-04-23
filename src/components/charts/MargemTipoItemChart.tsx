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
  tipo_item: string;
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
            {p.name === "Margem %"
              ? `${p.value?.toFixed(1)}%`
              : formatBRL(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
};

export default function MargemTipoItemChart({ data, height = 300 }: Props) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart
        data={data}
        layout="vertical"
        margin={{ top: 8, right: 60, left: 8, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
        <XAxis
          type="number"
          tickFormatter={formatShortBRL}
          tick={{ fontSize: 12, fill: "#64748b" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="tipo_item"
          tick={{ fontSize: 13, fill: "#374151" }}
          axisLine={false}
          tickLine={false}
          width={130}
        />
        <YAxis
          yAxisId="pct"
          type="number"
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
        <Bar
          dataKey="faturamento"
          name="Faturamento"
          fill="#2563eb"
          radius={[0, 4, 4, 0]}
          maxBarSize={28}
        />
        <Bar
          dataKey="lucro"
          name="Lucro Bruto"
          fill="#22c55e"
          radius={[0, 4, 4, 0]}
          maxBarSize={28}
        />
        <Line
          yAxisId="pct"
          type="monotone"
          dataKey="margem_pct"
          name="Margem %"
          stroke="#f59e0b"
          strokeWidth={2.5}
          dot={{ fill: "#f59e0b", r: 5, strokeWidth: 0 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
