"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import DetalhamentoTable from "@/components/DetalhamentoTable";

interface DetalhamentoRow {
  area: string;
  grupo: string;
  subgrupo: string;
  descricao_item: string;
  faturamento: number;
  custo: number | null;
  lucro: number | null;
  margem_pct: number | null;
  tem_custo: boolean;
}

export default function DetalhamentoPage() {
  const searchParams = useSearchParams();
  
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), 0, 1);
  const formatDate = (d: Date) => d.toISOString().split("T")[0];

  const startDate = searchParams.get("startDate") || formatDate(firstDay);
  const endDate = searchParams.get("endDate") || formatDate(today);
  const anoAtual = new Date(startDate).getFullYear();

  const [data, setData] = useState<DetalhamentoRow[]>([]);
  const [loading, setLoading] = useState(true);

  const buildParams = useCallback(() => {
    const p = new URLSearchParams();
    p.set("startDate", startDate);
    p.set("endDate", endDate);
    if (searchParams.get("tipoItem")) p.set("tipoItem", searchParams.get("tipoItem")!);
    if (searchParams.get("mecanico")) p.set("mecanico", searchParams.get("mecanico")!);
    if (searchParams.get("area")) p.set("area", searchParams.get("area")!);
    if (searchParams.get("grupo")) p.set("grupo", searchParams.get("grupo")!);
    if (searchParams.get("subgrupo")) p.set("subgrupo", searchParams.get("subgrupo")!);
    return p;
  }, [searchParams, startDate, endDate]);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/data/detalhamento?${buildParams()}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      });
  }, [buildParams]);

  return (
    <div>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: "700", color: "#1e293b", margin: "0 0 4px" }}>
          Detalhamento por Item
        </h1>
        <p style={{ fontSize: "14px", color: "#64748b", margin: 0 }}>
          Análise de faturamento, custo e margem por área, grupo, subgrupo e item — ano {anoAtual}.{" "}
          <span style={{ color: "#92400e", background: "#fffbeb", padding: "1px 6px", borderRadius: "4px" }}>
            Custo/Lucro/Margem disponíveis apenas a partir de jun/2025
          </span>
        </p>
      </div>

      <div
        style={{
          background: "#fff",
          border: "1px solid #e2e8f0",
          borderRadius: "12px",
          padding: "24px",
        }}
      >
        <DetalhamentoTable data={data} loading={loading} />
      </div>
    </div>
  );
}
