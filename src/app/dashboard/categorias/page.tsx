"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { formatDateRangeLabel } from "@/lib/period";

const DistributionPieChart = dynamic(
  () => import("@/components/charts/DistributionPieChart"),
  { ssr: false }
);

interface SubgrupoRow {
  area: string;
  grupo: string;
  subgrupo: string;
  faturamento: number;
  custo: number | null;
  lucro_bruto: number | null;
  margem_pct: number | null;
  total_orcamentos: number;
}

interface GrupoAgg {
  grupo: string;
  faturamento: number;
  custo: number | null;
  lucro_bruto: number | null;
  margem_pct: number | null;
  total_orcamentos: number;
  subgrupos: SubgrupoRow[];
}

interface AreaAgg {
  area: string;
  faturamento: number;
  custo: number | null;
  lucro_bruto: number | null;
  margem_pct: number | null;
  total_orcamentos: number;
  grupos: GrupoAgg[];
}

function formatBRL(value: number | null) {
  if (value === null) return <span style={{ color: "#94a3b8" }}>—</span>;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPct(value: number | null) {
  if (value === null) return <span style={{ color: "#94a3b8" }}>—</span>;
  const color = value >= 40 ? "#16a34a" : value >= 20 ? "#ca8a04" : "#dc2626";
  return <span style={{ color, fontWeight: 600 }}>{value.toFixed(1)}%</span>;
}

function sumNullable(a: number | null, b: number | null): number | null {
  if (a === null && b === null) return null;
  return (a ?? 0) + (b ?? 0);
}

function buildTree(rows: SubgrupoRow[]): AreaAgg[] {
  const areaMap = new Map<string, AreaAgg>();

  for (const row of rows) {
    if (!areaMap.has(row.area)) {
      areaMap.set(row.area, {
        area: row.area,
        faturamento: 0,
        custo: null,
        lucro_bruto: null,
        margem_pct: null,
        total_orcamentos: 0,
        grupos: [],
      });
    }
    const area = areaMap.get(row.area)!;
    area.faturamento += row.faturamento;
    area.custo = sumNullable(area.custo, row.custo);
    area.lucro_bruto = sumNullable(area.lucro_bruto, row.lucro_bruto);
    area.total_orcamentos += row.total_orcamentos;

    let grupo = area.grupos.find((g) => g.grupo === row.grupo);
    if (!grupo) {
      grupo = {
        grupo: row.grupo,
        faturamento: 0,
        custo: null,
        lucro_bruto: null,
        margem_pct: null,
        total_orcamentos: 0,
        subgrupos: [],
      };
      area.grupos.push(grupo);
    }
    grupo.faturamento += row.faturamento;
    grupo.custo = sumNullable(grupo.custo, row.custo);
    grupo.lucro_bruto = sumNullable(grupo.lucro_bruto, row.lucro_bruto);
    grupo.total_orcamentos += row.total_orcamentos;
    grupo.subgrupos.push(row);
  }

  for (const area of areaMap.values()) {
    area.margem_pct =
      area.lucro_bruto !== null && area.faturamento > 0
        ? (area.lucro_bruto / area.faturamento) * 100
        : null;
    for (const grupo of area.grupos) {
      grupo.margem_pct =
        grupo.lucro_bruto !== null && grupo.faturamento > 0
          ? (grupo.lucro_bruto / grupo.faturamento) * 100
          : null;
    }
  }

  return [...areaMap.values()].sort((a, b) => b.faturamento - a.faturamento);
}

const cellStyle = (align: "left" | "right" = "left"): React.CSSProperties => ({
  padding: "9px 14px",
  fontSize: "13px",
  textAlign: align,
  whiteSpace: "nowrap",
});

const thStyle = (align: "left" | "right" = "left"): React.CSSProperties => ({
  padding: "10px 14px",
  textAlign: align,
  fontSize: "12px",
  fontWeight: 600,
  color: "#64748b",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  whiteSpace: "nowrap",
  borderBottom: "1px solid #e2e8f0",
  background: "#f8fafc",
});

export default function CategoriasPage() {
  const searchParams = useSearchParams();

  const today = new Date();
  const firstDay = new Date(today.getFullYear(), 0, 1);
  const formatDate = (d: Date) => d.toISOString().split("T")[0];

  const startDate = searchParams.get("startDate") || formatDate(firstDay);
  const endDate = searchParams.get("endDate") || formatDate(today);
  const selectedPeriodLabel = formatDateRangeLabel(startDate, endDate);

  const [rows, setRows] = useState<SubgrupoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(new Set());
  const [expandedGrupos, setExpandedGrupos] = useState<Set<string>>(new Set());

  const buildParams = useCallback(() => {
    const p = new URLSearchParams();
    p.set("startDate", startDate);
    p.set("endDate", endDate);
    for (const key of ["tipoItem", "mecanico", "area", "grupo", "subgrupo"]) {
      const v = searchParams.get(key);
      if (v) p.set(key, v);
    }
    return p;
  }, [searchParams, startDate, endDate]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/data/itens-breakdown?${buildParams()}`)
      .then(async (res) => {
        const payload = await res.json();
        if (!res.ok) throw new Error(payload?.error || "Erro ao carregar dados");
        return payload as SubgrupoRow[];
      })
      .then(setRows)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Erro ao carregar dados");
      })
      .finally(() => setLoading(false));
  }, [buildParams]);

  const tree = useMemo(() => buildTree(rows), [rows]);

  const areaDistribution = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of rows) {
      map.set(r.area, (map.get(r.area) || 0) + r.faturamento);
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [rows]);

  const grupoDistribution = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of rows) {
      map.set(r.grupo, (map.get(r.grupo) || 0) + r.faturamento);
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [rows]);

  const subgrupoDistribution = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of rows) {
      map.set(r.subgrupo, (map.get(r.subgrupo) || 0) + r.faturamento);
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [rows]);

  const totals = useMemo(() => {
    let faturamento = 0;
    let custo: number | null = null;
    let lucro: number | null = null;
    let orcamentos = 0;
    for (const r of rows) {
      faturamento += r.faturamento;
      custo = sumNullable(custo, r.custo);
      lucro = sumNullable(lucro, r.lucro_bruto);
      orcamentos += r.total_orcamentos;
    }
    const margem = lucro !== null && faturamento > 0 ? (lucro / faturamento) * 100 : null;
    return { faturamento, custo, lucro, margem, orcamentos };
  }, [rows]);

  function toggleArea(area: string) {
    setExpandedAreas((prev) => {
      const next = new Set(prev);
      if (next.has(area)) {
        next.delete(area);
        setExpandedGrupos((g) => {
          const ng = new Set(g);
          tree.find((a) => a.area === area)?.grupos.forEach((gr) => ng.delete(`${area}|${gr.grupo}`));
          return ng;
        });
      } else {
        next.add(area);
      }
      return next;
    });
  }

  function toggleGrupo(area: string, grupo: string) {
    const key = `${area}|${grupo}`;
    setExpandedGrupos((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#1e293b", margin: "0 0 4px" }}>
          Categorias
        </h1>
        <p style={{ fontSize: "14px", color: "#64748b", margin: 0 }}>
          Faturamento, margem e orcamentos por area, grupo e subgrupo no periodo {selectedPeriodLabel}.
          Clique em uma linha para expandir.
        </p>
      </div>

      {error && (
        <div style={{ marginBottom: "24px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "12px", padding: "16px 18px", color: "#991b1b", fontSize: "14px" }}>
          {error}
        </div>
      )}

      {!loading && rows.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px", marginBottom: "24px" }}>
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "20px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#475569", marginBottom: "16px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Distribuicao por Area
            </h3>
            <DistributionPieChart data={areaDistribution} height={220} />
          </div>
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "20px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#475569", marginBottom: "16px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Distribuicao por Grupo
            </h3>
            <DistributionPieChart data={grupoDistribution} height={220} />
          </div>
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "20px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#475569", marginBottom: "16px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Distribuicao por Subgrupo
            </h3>
            <DistributionPieChart data={subgrupoDistribution} height={220} />
          </div>
        </div>
      )}

      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "24px" }}>
        {loading ? (
          <div style={{ height: "280px", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", fontSize: "14px" }}>
            Carregando...
          </div>
        ) : (
          <div style={{ overflowX: "auto", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={thStyle("left")}>Categoria</th>
                  <th style={thStyle("right")}>Faturamento</th>
                  <th style={thStyle("right")}>Custo</th>
                  <th style={thStyle("right")}>Lucro Bruto</th>
                  <th style={thStyle("right")}>Margem</th>
                  <th style={thStyle("right")}>Orcamentos</th>
                </tr>
              </thead>
              <tbody>
                {/* Totais */}
                <tr style={{ background: "#1e293b" }}>
                  <td style={{ ...cellStyle(), color: "#f8fafc", fontWeight: 700 }}>Total geral</td>
                  <td style={{ ...cellStyle("right"), color: "#f8fafc", fontWeight: 700 }}>{formatBRL(totals.faturamento)}</td>
                  <td style={{ ...cellStyle("right"), color: "#f8fafc", fontWeight: 700 }}>{formatBRL(totals.custo)}</td>
                  <td style={{ ...cellStyle("right"), color: "#f8fafc", fontWeight: 700 }}>{formatBRL(totals.lucro)}</td>
                  <td style={{ ...cellStyle("right"), color: "#f8fafc", fontWeight: 700 }}>
                    {totals.margem !== null ? `${totals.margem.toFixed(1)}%` : "—"}
                  </td>
                  <td style={{ ...cellStyle("right"), color: "#f8fafc", fontWeight: 700 }}>
                    {totals.orcamentos.toLocaleString("pt-BR")}
                  </td>
                </tr>

                {tree.map((area) => {
                  const areaExpanded = expandedAreas.has(area.area);
                  return [
                    /* Linha de area */
                    <tr
                      key={`area-${area.area}`}
                      onClick={() => toggleArea(area.area)}
                      style={{ background: "#f1f5f9", cursor: "pointer" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#e2e8f0")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "#f1f5f9")}
                    >
                      <td style={{ ...cellStyle(), fontWeight: 700, color: "#1e293b" }}>
                        <span style={{ marginRight: "8px", fontSize: "11px", color: "#64748b" }}>
                          {areaExpanded ? "▼" : "▶"}
                        </span>
                        {area.area}
                      </td>
                      <td style={{ ...cellStyle("right"), fontWeight: 700 }}>{formatBRL(area.faturamento)}</td>
                      <td style={{ ...cellStyle("right"), fontWeight: 700 }}>{formatBRL(area.custo)}</td>
                      <td style={{ ...cellStyle("right"), fontWeight: 700 }}>{formatBRL(area.lucro_bruto)}</td>
                      <td style={{ ...cellStyle("right") }}>{formatPct(area.margem_pct)}</td>
                      <td style={{ ...cellStyle("right"), fontWeight: 700 }}>
                        {area.total_orcamentos.toLocaleString("pt-BR")}
                      </td>
                    </tr>,

                    /* Linhas de grupo */
                    ...(!areaExpanded
                      ? []
                      : area.grupos
                          .sort((a, b) => b.faturamento - a.faturamento)
                          .flatMap((grupo) => {
                            const grupoKey = `${area.area}|${grupo.grupo}`;
                            const grupoExpanded = expandedGrupos.has(grupoKey);
                            return [
                              <tr
                                key={`grupo-${grupoKey}`}
                                onClick={() => toggleGrupo(area.area, grupo.grupo)}
                                style={{ background: "#fafafa", cursor: "pointer" }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = "#f1f5f9")}
                                onMouseLeave={(e) => (e.currentTarget.style.background = "#fafafa")}
                              >
                                <td style={{ ...cellStyle(), paddingLeft: "32px", color: "#374151", fontWeight: 600 }}>
                                  <span style={{ marginRight: "8px", fontSize: "11px", color: "#94a3b8" }}>
                                    {grupoExpanded ? "▼" : "▶"}
                                  </span>
                                  {grupo.grupo}
                                </td>
                                <td style={{ ...cellStyle("right") }}>{formatBRL(grupo.faturamento)}</td>
                                <td style={{ ...cellStyle("right") }}>{formatBRL(grupo.custo)}</td>
                                <td style={{ ...cellStyle("right") }}>{formatBRL(grupo.lucro_bruto)}</td>
                                <td style={{ ...cellStyle("right") }}>{formatPct(grupo.margem_pct)}</td>
                                <td style={{ ...cellStyle("right") }}>
                                  {grupo.total_orcamentos.toLocaleString("pt-BR")}
                                </td>
                              </tr>,

                              /* Linhas de subgrupo */
                              ...(!grupoExpanded
                                ? []
                                : grupo.subgrupos
                                    .sort((a, b) => b.faturamento - a.faturamento)
                                    .map((sub) => (
                                      <tr
                                        key={`sub-${area.area}-${grupo.grupo}-${sub.subgrupo}`}
                                        style={{ borderBottom: "1px solid #f1f5f9" }}
                                      >
                                        <td style={{ ...cellStyle(), paddingLeft: "56px", color: "#64748b" }}>
                                          {sub.subgrupo}
                                        </td>
                                        <td style={{ ...cellStyle("right"), color: "#374151" }}>{formatBRL(sub.faturamento)}</td>
                                        <td style={{ ...cellStyle("right"), color: "#374151" }}>{formatBRL(sub.custo)}</td>
                                        <td style={{ ...cellStyle("right"), color: "#374151" }}>{formatBRL(sub.lucro_bruto)}</td>
                                        <td style={{ ...cellStyle("right") }}>{formatPct(sub.margem_pct)}</td>
                                        <td style={{ ...cellStyle("right"), color: "#374151" }}>
                                          {sub.total_orcamentos.toLocaleString("pt-BR")}
                                        </td>
                                      </tr>
                                    ))),
                            ];
                          })),
                  ];
                })}

                {tree.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: "40px", textAlign: "center", color: "#94a3b8", fontSize: "14px" }}>
                      Nenhum dado encontrado para o periodo selecionado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
