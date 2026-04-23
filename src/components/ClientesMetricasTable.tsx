"use client";

import { useMemo, useState } from "react";

interface Row {
  nome_cliente: string;
  origem_cliente: string;
  total_orcamentos: number | null;
  ltv_historico: number | null;
  ticket_medio_historico: number | null;
  tempo_medio_entre_orcamentos_dias: number | null;
  faturamento_periodo: number;
  orcamentos_periodo: number;
  ticket_medio_periodo: number;
  tempo_medio_periodo_dias: number | null;
  data_primeiro_orcamento: string | null;
  data_ultimo_orcamento: string | null;
  primeiro_orcamento_periodo: string;
  ultimo_orcamento_periodo: string;
}

type SortKey = keyof Row;
type SortDir = "asc" | "desc";

function formatDate(value: string | null) {
  if (!value) {
    return <span style={{ color: "#94a3b8" }}>—</span>;
  }

  const normalizedDate = value.slice(0, 10);

  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${normalizedDate}T00:00:00Z`));
}

function formatBRL(value: number | null) {
  if (value === null) {
    return <span style={{ color: "#94a3b8" }}>—</span>;
  }

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDays(value: number | null) {
  if (value === null) {
    return <span style={{ color: "#94a3b8" }}>—</span>;
  }

  return `${value.toFixed(1)} dias`;
}

const COL_HEADERS: Array<{ key: SortKey; label: string; align?: "right" }> = [
  { key: "nome_cliente", label: "Cliente" },
  { key: "origem_cliente", label: "Origem" },
  { key: "orcamentos_periodo", label: "Orcs. periodo", align: "right" },
  { key: "faturamento_periodo", label: "Fat. periodo", align: "right" },
  { key: "ticket_medio_periodo", label: "Ticket periodo", align: "right" },
  { key: "ltv_historico", label: "LTV historico", align: "right" },
  { key: "ticket_medio_historico", label: "Ticket historico", align: "right" },
  {
    key: "tempo_medio_entre_orcamentos_dias",
    label: "Tempo medio hist.",
    align: "right",
  },
  { key: "data_ultimo_orcamento", label: "Ultimo orc. hist." },
];

interface Props {
  data: Row[];
  loading?: boolean;
}

export default function ClientesMetricasTable({ data, loading }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("ltv_historico");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 25;

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((current) => (current === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
    setPage(1);
  }

  const filtered = useMemo(() => {
    if (!search.trim()) {
      return data;
    }

    const query = search.toLowerCase();
    return data.filter(
      (row) =>
        row.nome_cliente.toLowerCase().includes(query) ||
        row.origem_cliente.toLowerCase().includes(query)
    );
  }, [data, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];

      if (av === null && bv === null) {
        return 0;
      }
      if (av === null) {
        return 1;
      }
      if (bv === null) {
        return -1;
      }

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

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "280px",
          color: "#64748b",
        }}
      >
        Carregando...
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "16px",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        <div style={{ fontSize: "13px", color: "#64748b" }}>
          {filtered.length.toLocaleString("pt-BR")} clientes no resultado
        </div>
        <input
          type="text"
          placeholder="Buscar cliente ou origem..."
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
            width: "260px",
            outline: "none",
          }}
        />
      </div>

      <div
        style={{
          overflowX: "auto",
          borderRadius: "8px",
          border: "1px solid #e2e8f0",
        }}
      >
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
                  Nenhum cliente encontrado
                </td>
              </tr>
            ) : (
              paged.map((row, index) => (
                <tr
                  key={`${row.nome_cliente}-${index}`}
                  style={{
                    borderBottom: "1px solid #f1f5f9",
                    background: index % 2 === 0 ? "#fff" : "#fafafa",
                  }}
                >
                  <td
                    style={{
                      padding: "9px 14px",
                      fontSize: "13px",
                      color: "#1e293b",
                      fontWeight: "500",
                      maxWidth: "240px",
                    }}
                  >
                    {row.nome_cliente}
                  </td>
                  <td style={{ padding: "9px 14px", fontSize: "13px", color: "#374151" }}>
                    {row.origem_cliente}
                  </td>
                  <td style={{ padding: "9px 14px", fontSize: "13px", textAlign: "right" }}>
                    {row.orcamentos_periodo.toLocaleString("pt-BR")}
                  </td>
                  <td style={{ padding: "9px 14px", fontSize: "13px", textAlign: "right" }}>
                    {formatBRL(row.faturamento_periodo)}
                  </td>
                  <td style={{ padding: "9px 14px", fontSize: "13px", textAlign: "right" }}>
                    {formatBRL(row.ticket_medio_periodo)}
                  </td>
                  <td style={{ padding: "9px 14px", fontSize: "13px", textAlign: "right" }}>
                    {formatBRL(row.ltv_historico)}
                  </td>
                  <td style={{ padding: "9px 14px", fontSize: "13px", textAlign: "right" }}>
                    {formatBRL(row.ticket_medio_historico)}
                  </td>
                  <td style={{ padding: "9px 14px", fontSize: "13px", textAlign: "right" }}>
                    {formatDays(row.tempo_medio_entre_orcamentos_dias)}
                  </td>
                  <td style={{ padding: "9px 14px", fontSize: "13px", whiteSpace: "nowrap" }}>
                    {formatDate(row.data_ultimo_orcamento)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

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
            Mostrando {(page - 1) * pageSize + 1}-
            {Math.min(page * pageSize, sorted.length)} de {sorted.length}
          </span>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => setPage((current) => Math.max(1, current - 1))}
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
              onClick={() =>
                setPage((current) => Math.min(totalPages, current + 1))
              }
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
              Proxima →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
