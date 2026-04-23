"use client";

import { useState, useMemo } from "react";

interface Row {
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

type SortKey = keyof Row;
type SortDir = "asc" | "desc";

function fmt(v: number | null) {
  if (v === null) return <span style={{ color: "#94a3b8" }}>—</span>;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v);
}

function fmtPct(v: number | null) {
  if (v === null) return <span style={{ color: "#94a3b8" }}>—</span>;
  return (
    <span style={{ color: v >= 0 ? "#16a34a" : "#dc2626", fontWeight: "600" }}>
      {v.toFixed(1)}%
    </span>
  );
}

const COL_HEADERS: { key: SortKey; label: string; align?: "right" }[] = [
  { key: "area", label: "Área" },
  { key: "grupo", label: "Grupo" },
  { key: "subgrupo", label: "Subgrupo" },
  { key: "descricao_item", label: "Item" },
  { key: "faturamento", label: "Faturamento", align: "right" },
  { key: "custo", label: "Custo", align: "right" },
  { key: "lucro", label: "Lucro Bruto", align: "right" },
  { key: "margem_pct", label: "Margem %", align: "right" },
];

interface Props {
  data: Row[];
  loading?: boolean;
}

export default function DetalhamentoTable({ data, loading }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("faturamento");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 50;

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
    setPage(1);
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter(
      (r) =>
        r.area.toLowerCase().includes(q) ||
        r.grupo.toLowerCase().includes(q) ||
        r.subgrupo.toLowerCase().includes(q) ||
        r.descricao_item.toLowerCase().includes(q)
    );
  }, [data, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;
      if (typeof av === "string" && typeof bv === "string") {
        return sortDir === "asc"
          ? av.localeCompare(bv)
          : bv.localeCompare(av);
      }
      const an = Number(av);
      const bn = Number(bv);
      return sortDir === "asc" ? an - bn : bn - an;
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.ceil(sorted.length / pageSize);
  const paged = sorted.slice((page - 1) * pageSize, page * pageSize);

  // Summary totals
  const totals = useMemo(() => {
    const fat = filtered.reduce((s, r) => s + r.faturamento, 0);
    const lucro = filtered.reduce(
      (s, r) => s + (r.lucro ?? 0),
      0
    );
    const custo = filtered.reduce(
      (s, r) => s + (r.custo ?? 0),
      0
    );
    return { fat, lucro, custo, margem: fat > 0 ? (lucro / fat) * 100 : 0 };
  }, [filtered]);

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "300px",
          color: "#64748b",
        }}
      >
        Carregando...
      </div>
    );
  }

  return (
    <div>
      {/* Summary + Search */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "16px",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
          {[
            { label: "Faturamento Total", value: fmt(totals.fat) },
            { label: "Lucro Bruto", value: fmt(totals.lucro) },
            { label: "Margem Média", value: fmtPct(totals.margem) },
            { label: "Itens", value: filtered.length.toLocaleString("pt-BR") },
          ].map((s) => (
            <div key={s.label}>
              <div style={{ fontSize: "11px", color: "#94a3b8", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {s.label}
              </div>
              <div style={{ fontSize: "18px", fontWeight: "700", color: "#1e293b" }}>
                {s.value}
              </div>
            </div>
          ))}
        </div>
        <input
          type="text"
          placeholder="Buscar item, área, grupo..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          style={{
            padding: "8px 12px",
            border: "1px solid #e2e8f0",
            borderRadius: "6px",
            fontSize: "13px",
            color: "#374151",
            width: "240px",
            outline: "none",
          }}
        />
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              {COL_HEADERS.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  style={{
                    padding: "10px 14px",
                    textAlign: col.align || "left",
                    fontSize: "12px",
                    fontWeight: "600",
                    color: "#64748b",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    cursor: "pointer",
                    userSelect: "none",
                    whiteSpace: "nowrap",
                    borderBottom: "1px solid #e2e8f0",
                  }}
                >
                  {col.label}{" "}
                  {sortKey === col.key && (
                    <span style={{ color: "#2563eb" }}>
                      {sortDir === "asc" ? "↑" : "↓"}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr>
                <td
                  colSpan={COL_HEADERS.length}
                  style={{
                    padding: "40px",
                    textAlign: "center",
                    color: "#94a3b8",
                    fontSize: "14px",
                  }}
                >
                  Nenhum dado encontrado
                </td>
              </tr>
            ) : (
              paged.map((row, i) => (
                <tr
                  key={i}
                  style={{
                    borderBottom: "1px solid #f1f5f9",
                    background: i % 2 === 0 ? "#fff" : "#fafafa",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "#eff6ff")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background =
                      i % 2 === 0 ? "#fff" : "#fafafa")
                  }
                >
                  <td style={{ padding: "9px 14px", fontSize: "13px", color: "#374151" }}>
                    {row.area}
                  </td>
                  <td style={{ padding: "9px 14px", fontSize: "13px", color: "#374151" }}>
                    {row.grupo}
                  </td>
                  <td style={{ padding: "9px 14px", fontSize: "13px", color: "#374151" }}>
                    {row.subgrupo}
                  </td>
                  <td
                    style={{
                      padding: "9px 14px",
                      fontSize: "13px",
                      color: "#1e293b",
                      fontWeight: "500",
                      maxWidth: "260px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={row.descricao_item}
                  >
                    {row.descricao_item}
                  </td>
                  <td style={{ padding: "9px 14px", fontSize: "13px", textAlign: "right", color: "#1e293b" }}>
                    {fmt(row.faturamento)}
                  </td>
                  <td style={{ padding: "9px 14px", fontSize: "13px", textAlign: "right", color: "#1e293b" }}>
                    {fmt(row.custo)}
                  </td>
                  <td style={{ padding: "9px 14px", fontSize: "13px", textAlign: "right", color: "#1e293b" }}>
                    {fmt(row.lucro)}
                  </td>
                  <td style={{ padding: "9px 14px", fontSize: "13px", textAlign: "right" }}>
                    {fmtPct(row.margem_pct)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: "16px",
            fontSize: "13px",
            color: "#64748b",
          }}
        >
          <span>
            Mostrando {(page - 1) * pageSize + 1}–
            {Math.min(page * pageSize, sorted.length)} de {sorted.length}
          </span>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{
                padding: "6px 12px",
                border: "1px solid #e2e8f0",
                borderRadius: "6px",
                background: page === 1 ? "#f8fafc" : "#fff",
                color: page === 1 ? "#94a3b8" : "#374151",
                cursor: page === 1 ? "not-allowed" : "pointer",
                fontSize: "13px",
              }}
            >
              ← Anterior
            </button>
            <span style={{ padding: "6px 12px" }}>
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              style={{
                padding: "6px 12px",
                border: "1px solid #e2e8f0",
                borderRadius: "6px",
                background: page === totalPages ? "#f8fafc" : "#fff",
                color: page === totalPages ? "#94a3b8" : "#374151",
                cursor: page === totalPages ? "not-allowed" : "pointer",
                fontSize: "13px",
              }}
            >
              Próxima →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
