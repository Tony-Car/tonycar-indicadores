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
  origem_cliente: string;
  clientes_ativos: number;
  faturamento_periodo: number;
  faturamento_medio_por_cliente: number;
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

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ payload: DataPoint; value: number; name: string; color: string }>;
  label?: string;
}) => {
  if (!active || !payload?.length) {
    return null;
  }

  const point = payload[0]?.payload;

  if (!point) {
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
        minWidth: "220px",
      }}
    >
      <p style={{ fontWeight: "600", color: "#1e293b", marginBottom: "8px" }}>
        {label}
      </p>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "16px" }}>
        <span style={{ color: "#64748b" }}>Clientes ativos</span>
        <span style={{ color: "#1e293b" }}>
          {point.clientes_ativos.toLocaleString("pt-BR")}
        </span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", marginTop: "4px" }}>
        <span style={{ color: "#64748b" }}>Faturamento</span>
        <span style={{ color: "#1e293b" }}>{formatBRL(point.faturamento_periodo)}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", marginTop: "4px" }}>
        <span style={{ color: "#64748b" }}>Media por cliente</span>
        <span style={{ color: "#1e293b" }}>
          {formatBRL(point.faturamento_medio_por_cliente)}
        </span>
      </div>
    </div>
  );
};

export default function ClientesOrigemChart({ data, height = 320 }: Props) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 8, right: 24, left: 8, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fontSize: 12, fill: "#64748b" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="origem_cliente"
          tick={{ fontSize: 12, fill: "#374151" }}
          axisLine={false}
          tickLine={false}
          width={150}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar
          dataKey="clientes_ativos"
          name="Clientes ativos"
          fill="#0f766e"
          radius={[0, 4, 4, 0]}
          maxBarSize={28}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
