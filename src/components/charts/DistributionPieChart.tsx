"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface DataPoint {
  name: string;
  value: number;
}

interface Props {
  data: DataPoint[];
  height?: number;
}

const COLORS = [
  "#2563eb", // blue-600
  "#16a34a", // green-600
  "#dc2626", // red-600
  "#ca8a04", // yellow-600
  "#7c3aed", // violet-600
  "#ea580c", // orange-600
  "#0891b2", // cyan-600
  "#db2777", // pink-600
  "#4b5563", // gray-600
  "#9333ea", // purple-600
];

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
  total,
}: {
  active?: boolean;
  payload?: any[];
  total: number;
}) => {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  const percent = total > 0 ? (data.value / total) * 100 : 0;

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: "10px",
        padding: "12px 16px",
        boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
        fontSize: "13px",
      }}
    >
      <p style={{ fontWeight: "600", color: "#1e293b", marginBottom: "4px" }}>
        {data.name}
      </p>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
        <span style={{ color: "#64748b" }}>Faturamento:</span>
        <span style={{ fontWeight: "600", color: "#1e293b" }}>{formatBRL(data.value)}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
        <span style={{ color: "#64748b" }}>Participação:</span>
        <span style={{ fontWeight: "600", color: "#16a34a" }}>{percent.toFixed(1)}%</span>
      </div>
    </div>
  );
};

export default function DistributionPieChart({ data, height = 300 }: Props) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  // Filter out zero or negative values
  const filteredData = data.filter(d => d.value > 0);

  // Group small items into "Outros" if they are too many
  const sortedData = [...filteredData].sort((a, b) => b.value - a.value);
  const displayData = sortedData.length > 10 
    ? [
        ...sortedData.slice(0, 9),
        {
          name: "Outros",
          value: sortedData.slice(9).reduce((sum, item) => sum + item.value, 0)
        }
      ]
    : sortedData;

  if (displayData.length === 0) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '14px' }}>
        Nenhum dado para exibir
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={displayData}
          cx="40%"
          cy="50%"
          innerRadius={height * 0.2}
          outerRadius={height * 0.35}
          paddingAngle={2}
          dataKey="value"
          labelLine={false}
        >
          {displayData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip total={total} />} />
        <Legend 
          layout="vertical" 
          verticalAlign="middle" 
          align="right"
          wrapperStyle={{ fontSize: "12px", paddingLeft: "10px", maxWidth: '50%' }}
          formatter={(value) => {
            const item = displayData.find(d => d.name === value);
            const percent = total > 0 && item ? (item.value / total) * 100 : 0;
            return (
              <span style={{ color: "#475569", whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'inline-block', maxWidth: '150px' }}>
                {value} ({percent.toFixed(1)}%)
              </span>
            );
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
