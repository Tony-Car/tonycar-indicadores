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
  lucro_atual: number;
  margem_pct_atual: number;
  faturamento_anterior: number;
  lucro_anterior: number;
  margem_pct_anterior: number;
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

  const luc_atual = payload.find((p) => p.name === "Lucro selecionado")?.value ?? 0;
  const luc_anterior = payload.find((p) => p.name === "Lucro comparativo")?.value ?? 0;
  const crescimento = luc_anterior > 0 ? ((luc_atual - luc_anterior) / luc_anterior) * 100 : null;

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
              {isPercent
                ? `${p.value?.toFixed(1)}%`
                : formatBRL(p.value)}
            </span>
          </div>
        );
      })}
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
          <span style={{ color: "#64748b" }}>Crescimento Lucro</span>
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

export default function MargemYoYChart({ data, height = 340 }: Props) {
  const enriched = data.map(d => ({
    ...d,
    crescimento_lucro: d.lucro_anterior > 0 ? ((d.lucro_atual - d.lucro_anterior) / d.lucro_anterior) * 100 : null
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
          dataKey="lucro_atual"
          name="Lucro selecionado"
          fill="#22c55e"
          radius={[4, 4, 0, 0]}
          maxBarSize={48}
        />
        <Bar
          yAxisId="left"
          dataKey="lucro_anterior"
          name="Lucro comparativo"
          fill="#cbd5e1"
          radius={[4, 4, 0, 0]}
          maxBarSize={48}
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="margem_pct_atual"
          name="Margem % selecionada"
          stroke="#2563eb"
          strokeWidth={2.5}
          dot={{ fill: "#2563eb", r: 4, strokeWidth: 0 }}
          activeDot={{ r: 6 }}
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="margem_pct_anterior"
          name="Margem % comparativa"
          stroke="#94a3b8"
          strokeWidth={2}
          strokeDasharray="5 4"
          dot={{ fill: "#94a3b8", r: 3, strokeWidth: 0 }}
          activeDot={{ r: 5 }}
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="crescimento_lucro"
          name="Crescimento Lucro %"
          stroke="#f59e0b"
          strokeWidth={2}
          dot={{ fill: "#f59e0b", r: 3, strokeWidth: 0 }}
          connectNulls
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
