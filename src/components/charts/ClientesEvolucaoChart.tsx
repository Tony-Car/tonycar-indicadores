"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface DataPoint {
  label: string;
  clientes_novos: number;
  clientes_antigos: number;
  clientes_ativos: number;
}

interface Props {
  data: DataPoint[];
  height?: number;
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
  if (!active || !payload?.length) {
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
        minWidth: "200px",
      }}
    >
      <p style={{ fontWeight: "600", color: "#1e293b", marginBottom: "8px" }}>
        {label}
      </p>
      {payload.map((item) => (
        <div
          key={item.name}
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "16px",
            marginBottom: "4px",
          }}
        >
          <span style={{ color: item.color, fontWeight: "500" }}>{item.name}</span>
          <span style={{ color: "#1e293b" }}>
            {item.value.toLocaleString("pt-BR")}
          </span>
        </div>
      ))}
    </div>
  );
};

export default function ClientesEvolucaoChart({ data, height = 320 }: Props) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 8, right: 24, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 12, fill: "#64748b" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 12, fill: "#64748b" }}
          axisLine={false}
          tickLine={false}
          width={48}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: "13px", paddingTop: "12px" }}
          formatter={(value) => <span style={{ color: "#475569" }}>{value}</span>}
        />
        <Bar
          dataKey="clientes_novos"
          name="Clientes novos"
          fill="#2563eb"
          radius={[4, 4, 0, 0]}
          maxBarSize={40}
        />
        <Bar
          dataKey="clientes_antigos"
          name="Clientes antigos"
          fill="#cbd5e1"
          radius={[4, 4, 0, 0]}
          maxBarSize={40}
        />
        <Line
          type="monotone"
          dataKey="clientes_ativos"
          name="Clientes ativos"
          stroke="#16a34a"
          strokeWidth={2.5}
          dot={{ fill: "#16a34a", r: 4, strokeWidth: 0 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
