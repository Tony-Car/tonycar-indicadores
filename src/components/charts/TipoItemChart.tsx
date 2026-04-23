"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface DataPoint {
  tipo_item: string;
  faturamento_atual: number;
  faturamento_anterior: number;
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
  const atual =
    payload.find((p) => p.name === "Periodo selecionado")?.value ?? 0;
  const anterior =
    payload.find((p) => p.name === "Periodo comparativo")?.value ?? 0;
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
          <span style={{ color: "#1e293b" }}>{formatBRL(p.value)}</span>
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

export default function TipoItemChart({ data, height = 300 }: Props) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        margin={{ top: 8, right: 24, left: 8, bottom: 0 }}
        layout="vertical"
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
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: "13px", paddingTop: "12px" }}
          formatter={(value) => (
            <span style={{ color: "#475569" }}>{value}</span>
          )}
        />
        <Bar
          dataKey="faturamento_atual"
          name="Periodo selecionado"
          fill="#2563eb"
          radius={[0, 4, 4, 0]}
          maxBarSize={32}
        />
        <Bar
          dataKey="faturamento_anterior"
          name="Periodo comparativo"
          fill="#cbd5e1"
          radius={[0, 4, 4, 0]}
          maxBarSize={32}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
