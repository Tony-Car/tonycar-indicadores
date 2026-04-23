"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface DataPoint {
  nome_cliente: string;
  ltv_historico: number | null;
  ticket_medio_historico: number | null;
  tempo_medio_entre_orcamentos_dias: number | null;
  total_orcamentos: number | null;
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
    maximumFractionDigits: 0,
  }).format(value);
}

function formatShortBRL(value: number) {
  if (value >= 1_000_000) {
    return `R$ ${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `R$ ${(value / 1_000).toFixed(0)}k`;
  }
  return `R$ ${value.toFixed(0)}`;
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ payload: DataPoint }>;
  label?: string;
}) => {
  if (!active || !payload?.length) {
    return null;
  }

  const point = payload[0]?.payload;

  if (!point || point.ltv_historico === null) {
    return null;
  }

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: "10px",
        padding: "12px 16px",
        boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
        fontSize: "13px",
        minWidth: "240px",
      }}
    >
      <p style={{ fontWeight: "600", color: "#1e293b", marginBottom: "8px" }}>
        {label}
      </p>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "16px" }}>
        <span style={{ color: "#64748b" }}>LTV historico</span>
        <span style={{ color: "#1e293b" }}>{formatBRL(point.ltv_historico)}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", marginTop: "4px" }}>
        <span style={{ color: "#64748b" }}>Ticket medio historico</span>
        <span style={{ color: "#1e293b" }}>
          {point.ticket_medio_historico !== null
            ? formatBRL(point.ticket_medio_historico)
            : "—"}
        </span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", marginTop: "4px" }}>
        <span style={{ color: "#64748b" }}>Tempo medio entre orcamentos</span>
        <span style={{ color: "#1e293b" }}>
          {point.tempo_medio_entre_orcamentos_dias !== null
            ? `${point.tempo_medio_entre_orcamentos_dias.toFixed(1)} dias`
            : "—"}
        </span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", marginTop: "4px" }}>
        <span style={{ color: "#64748b" }}>Orcamentos</span>
        <span style={{ color: "#1e293b" }}>
          {point.total_orcamentos?.toLocaleString("pt-BR") ?? "—"}
        </span>
      </div>
    </div>
  );
};

export default function ClientesLtvChart({ data, height = 360 }: Props) {
  const filtered = data.filter((item) => item.ltv_historico !== null);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={filtered}
        layout="vertical"
        margin={{ top: 8, right: 24, left: 8, bottom: 0 }}
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
          dataKey="nome_cliente"
          tick={{ fontSize: 12, fill: "#374151" }}
          axisLine={false}
          tickLine={false}
          width={160}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar
          dataKey="ltv_historico"
          name="LTV historico"
          fill="#2563eb"
          radius={[0, 4, 4, 0]}
          maxBarSize={26}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
