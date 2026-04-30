"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

interface FiltrosDisponiveis {
  mecanicos: string[];
  areas: string[];
  grupos: string[];
  subgrupos: string[];
  tipo_item: string[];
  status: string[];
}

function MultiSelect({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggle = (v: string) => {
    if (selected.includes(v)) {
      onChange(selected.filter((s) => s !== v));
    } else {
      onChange([...selected, v]);
    }
  };

  const displayText =
    selected.length === 0
      ? "Todos"
      : selected.length === 1
      ? selected[0]
      : `${selected.length} selecionados`;

  return (
    <div ref={ref} style={{ position: "relative", minWidth: "140px" }}>
      <div
        style={{
          fontSize: "11px",
          fontWeight: "600",
          color: "#64748b",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          marginBottom: "4px",
        }}
      >
        {label}
      </div>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          padding: "7px 10px",
          border: `1px solid ${selected.length > 0 ? "#2563eb" : "#e2e8f0"}`,
          borderRadius: "6px",
          background: selected.length > 0 ? "#eff6ff" : "#fff",
          fontSize: "13px",
          color: selected.length > 0 ? "#2563eb" : "#374151",
          cursor: "pointer",
          textAlign: "left",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "4px",
          whiteSpace: "nowrap",
          fontWeight: selected.length > 0 ? "500" : "400",
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
          {displayText}
        </span>
        <span style={{ opacity: 0.5 }}>▾</span>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            zIndex: 100,
            minWidth: "200px",
            maxHeight: "260px",
            overflowY: "auto",
            padding: "4px",
          }}
        >
          {options.length === 0 ? (
            <div style={{ padding: "10px 12px", color: "#94a3b8", fontSize: "13px" }}>
              Nenhuma opção
            </div>
          ) : (
            <>
              {selected.length > 0 && (
                <button
                  onClick={() => onChange([])}
                  style={{
                    width: "100%",
                    padding: "6px 12px",
                    textAlign: "left",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "12px",
                    color: "#2563eb",
                    borderBottom: "1px solid #f1f5f9",
                    marginBottom: "2px",
                  }}
                >
                  Limpar seleção
                </button>
              )}
              {options.map((opt) => (
                <label
                  key={opt}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "7px 12px",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "13px",
                    color: "#374151",
                    background: selected.includes(opt) ? "#eff6ff" : "transparent",
                  }}
                  onMouseEnter={(e) =>
                    !selected.includes(opt) &&
                    (e.currentTarget.style.background = "#f8fafc")
                  }
                  onMouseLeave={(e) =>
                    !selected.includes(opt) &&
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(opt)}
                    onChange={() => toggle(opt)}
                    style={{ accentColor: "#2563eb" }}
                  />
                  {opt}
                </label>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function DashboardFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [filtros, setFiltros] = useState<FiltrosDisponiveis | null>(null);

  // Default dates: Start of current year to today (better for a global view)
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), 0, 1);
  const formatDate = (d: Date) => d.toISOString().split("T")[0];

  const startDate = searchParams.get("startDate") || formatDate(firstDay);
  const endDate = searchParams.get("endDate") || formatDate(today);
  
  const tipoItem = searchParams.get("tipoItem")?.split(",").filter(Boolean) || [];
  const status = searchParams.get("status")?.split(",").filter(Boolean) || [];
  const mecanico = searchParams.get("mecanico")?.split(",").filter(Boolean) || [];
  const area = searchParams.get("area")?.split(",").filter(Boolean) || [];
  const grupo = searchParams.get("grupo")?.split(",").filter(Boolean) || [];
  const subgrupo = searchParams.get("subgrupo")?.split(",").filter(Boolean) || [];

  useEffect(() => {
    fetch("/api/data/filtros")
      .then((r) => r.json())
      .then(setFiltros);
  }, []);

  function updateParam(key: string, value: string | string[]) {
    const params = new URLSearchParams(searchParams.toString());
    if (Array.isArray(value)) {
      if (value.length === 0) {
        params.delete(key);
      } else {
        params.set(key, value.join(","));
      }
    } else {
      params.set(key, value);
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  const hasFilters =
    tipoItem.length > 0 ||
    status.length > 0 ||
    mecanico.length > 0 ||
    area.length > 0 ||
    grupo.length > 0 ||
    subgrupo.length > 0;

  function clearAll() {
    const params = new URLSearchParams();
    params.set("startDate", formatDate(firstDay));
    params.set("endDate", formatDate(today));
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div
      style={{
        background: "#fff",
        borderBottom: "1px solid #e2e8f0",
        padding: "12px 24px",
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "16px",
          alignItems: "flex-end",
          maxWidth: "1400px",
          margin: "0 auto",
        }}
      >
        {/* Período */}
        <div style={{ display: "flex", gap: "8px" }}>
          <div>
            <div style={{ fontSize: "11px", fontWeight: "600", color: "#64748b", textTransform: "uppercase", marginBottom: "4px" }}>
              Início
            </div>
            <input
              type="date"
              value={startDate}
              onChange={(e) => updateParam("startDate", e.target.value)}
              style={{
                padding: "7px 10px",
                border: "1px solid #e2e8f0",
                borderRadius: "6px",
                fontSize: "13px",
                color: "#374151",
                background: "#fff",
              }}
            />
          </div>
          <div>
            <div style={{ fontSize: "11px", fontWeight: "600", color: "#64748b", textTransform: "uppercase", marginBottom: "4px" }}>
              Fim
            </div>
            <input
              type="date"
              value={endDate}
              onChange={(e) => updateParam("endDate", e.target.value)}
              style={{
                padding: "7px 10px",
                border: "1px solid #e2e8f0",
                borderRadius: "6px",
                fontSize: "13px",
                color: "#374151",
                background: "#fff",
              }}
            />
          </div>
        </div>

        {/* Tipo Item */}
        <MultiSelect
          label="Tipo de Item"
          options={filtros?.tipo_item || []}
          selected={tipoItem}
          onChange={(v) => updateParam("tipoItem", v)}
        />

        {/* Status */}
        <MultiSelect
          label="Status"
          options={filtros?.status || []}
          selected={status}
          onChange={(v) => updateParam("status", v)}
        />

        {/* Mecânico */}
        <MultiSelect
          label="Mecânico"
          options={filtros?.mecanicos || []}
          selected={mecanico}
          onChange={(v) => updateParam("mecanico", v)}
        />

        {/* Área */}
        <MultiSelect
          label="Área"
          options={filtros?.areas || []}
          selected={area}
          onChange={(v) => updateParam("area", v)}
        />

        {/* Grupo */}
        <MultiSelect
          label="Grupo"
          options={filtros?.grupos || []}
          selected={grupo}
          onChange={(v) => updateParam("grupo", v)}
        />

        {/* Subgrupo */}
        <MultiSelect
          label="Subgrupo"
          options={filtros?.subgrupos || []}
          selected={subgrupo}
          onChange={(v) => updateParam("subgrupo", v)}
        />

        {/* Clear */}
        {hasFilters && (
          <button
            onClick={clearAll}
            style={{
              padding: "7px 12px",
              border: "1px solid #fecaca",
              borderRadius: "6px",
              background: "#fef2f2",
              color: "#dc2626",
              fontSize: "13px",
              cursor: "pointer",
              alignSelf: "flex-end",
              fontWeight: "500",
            }}
          >
            Limpar filtros
          </button>
        )}
      </div>
    </div>
  );
}
