import { NextRequest, NextResponse } from "next/server";
import { getDb, buildFilterConditions, parseArrayParam } from "@/lib/db";

const MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const granularity = sp.get("granularity") || "mensal";
  
  const startDate = sp.get("startDate");
  const endDate = sp.get("endDate");

  if (!startDate || !endDate) {
    return NextResponse.json({ error: "startDate e endDate são obrigatórios" }, { status: 400 });
  }

  const filters = {
    tipoItem: parseArrayParam(sp.get("tipoItem")),
    mecanico: parseArrayParam(sp.get("mecanico")),
    area: parseArrayParam(sp.get("area")),
    grupo: parseArrayParam(sp.get("grupo")),
    subgrupo: parseArrayParam(sp.get("subgrupo")),
  };

  try {
    const db = getDb();
    const { conditions, params } = buildFilterConditions(filters, 5);
    const allConditions = [...conditions, "io.flag_custos_atualizados = true"];
    
    // Período Atual
    const pAtualStart = startDate;
    const pAtualEnd = endDate;
    
    // Período Anterior
    const pAnteriorStart = new Date(startDate);
    pAnteriorStart.setFullYear(pAnteriorStart.getFullYear() - 1);
    const pAnteriorEnd = new Date(endDate);
    pAnteriorEnd.setFullYear(pAnteriorEnd.getFullYear() - 1);

    const pAntS = pAnteriorStart.toISOString().split('T')[0];
    const pAntE = pAnteriorEnd.toISOString().split('T')[0];

    if (granularity === "mensal") {
      const query = `
        WITH base AS (
          SELECT
            CASE 
              WHEN io.data_orcamento >= $1 AND io.data_orcamento <= $2 THEN 'atual'
              WHEN io.data_orcamento >= $3 AND io.data_orcamento <= $4 THEN 'anterior'
            END AS periodo,
            EXTRACT(MONTH FROM io.data_orcamento)::int AS mes,
            SUM(io.valor_total_item) AS faturamento,
            SUM(io.lucro_bruto_total) AS lucro
          FROM marts.itens_orcamento io
          INNER JOIN marts.orcamentos o ON io.nk_orcamento = o.nk_orcamento
          WHERE ${allConditions.join(" AND ")}
            AND (
              (io.data_orcamento >= $1 AND io.data_orcamento <= $2) OR
              (io.data_orcamento >= $3 AND io.data_orcamento <= $4)
            )
          GROUP BY 1, 2
        )
        SELECT
          mes,
          COALESCE(SUM(CASE WHEN periodo = 'atual' THEN faturamento END), 0) AS faturamento_atual,
          COALESCE(SUM(CASE WHEN periodo = 'atual' THEN lucro END), 0) AS lucro_atual,
          COALESCE(SUM(CASE WHEN periodo = 'anterior' THEN faturamento END), 0) AS faturamento_anterior,
          COALESCE(SUM(CASE WHEN periodo = 'anterior' THEN lucro END), 0) AS lucro_anterior
        FROM base
        GROUP BY mes
        ORDER BY mes
      `;

      const rows = await db.query(query, [pAtualStart, pAtualEnd, pAntS, pAntE, ...params]) as unknown as Array<{
        mes: number; faturamento_atual: string; lucro_atual: string;
        faturamento_anterior: string; lucro_anterior: string;
      }>;

      const result = rows.map((r) => {
        const fat_a = parseFloat(r.faturamento_atual);
        const luc_a = parseFloat(r.lucro_atual);
        const fat_p = parseFloat(r.faturamento_anterior);
        const luc_p = parseFloat(r.lucro_anterior);
        return {
          label: MESES[r.mes - 1],
          faturamento_atual: fat_a,
          lucro_atual: luc_a,
          margem_pct_atual: fat_a > 0 ? (luc_a / fat_a) * 100 : 0,
          faturamento_anterior: fat_p,
          lucro_anterior: luc_p,
          margem_pct_anterior: fat_p > 0 ? (luc_p / fat_p) * 100 : 0,
        };
      });

      return NextResponse.json(result);
    }

    if (granularity === "semanal") {
      const query = `
        WITH base AS (
          SELECT
            CASE 
              WHEN io.data_orcamento >= $1 AND io.data_orcamento <= $2 THEN 'atual'
              WHEN io.data_orcamento >= $3 AND io.data_orcamento <= $4 THEN 'anterior'
            END AS periodo,
            EXTRACT(WEEK FROM io.data_orcamento)::int AS semana_num,
            DATE_TRUNC('week', io.data_orcamento)::date AS semana_inicio,
            SUM(io.valor_total_item) AS faturamento,
            SUM(io.lucro_bruto_total) AS lucro
          FROM marts.itens_orcamento io
          INNER JOIN marts.orcamentos o ON io.nk_orcamento = o.nk_orcamento
          WHERE ${allConditions.join(" AND ")}
            AND (
              (io.data_orcamento >= $1 AND io.data_orcamento <= $2) OR
              (io.data_orcamento >= $3 AND io.data_orcamento <= $4)
            )
          GROUP BY 1, 2, 3
        )
        SELECT
          semana_num,
          MAX(CASE WHEN periodo = 'atual' THEN semana_inicio END) AS semana_inicio_atual,
          COALESCE(SUM(CASE WHEN periodo = 'atual' THEN faturamento END), 0) AS faturamento_atual,
          COALESCE(SUM(CASE WHEN periodo = 'atual' THEN lucro END), 0) AS lucro_atual,
          COALESCE(SUM(CASE WHEN periodo = 'anterior' THEN faturamento END), 0) AS faturamento_anterior,
          COALESCE(SUM(CASE WHEN periodo = 'anterior' THEN lucro END), 0) AS lucro_anterior
        FROM base
        GROUP BY semana_num
        ORDER BY semana_num
      `;

      const rows = await db.query(query, [pAtualStart, pAtualEnd, pAntS, pAntE, ...params]) as unknown as Array<{
        semana_num: number; semana_inicio_atual: string | null;
        faturamento_atual: string; lucro_atual: string;
        faturamento_anterior: string; lucro_anterior: string;
      }>;

      const result = rows.map((r) => {
        let label = `S${r.semana_num}`;
        if (r.semana_inicio_atual) {
          const d = new Date(r.semana_inicio_atual);
          label = `${String(d.getUTCDate()).padStart(2,"0")}/${String(d.getUTCMonth()+1).padStart(2,"0")}`;
        }
        const fat_a = parseFloat(r.faturamento_atual);
        const luc_a = parseFloat(r.lucro_atual);
        const fat_p = parseFloat(r.faturamento_anterior);
        const luc_p = parseFloat(r.lucro_anterior);
        return {
          label,
          faturamento_atual: fat_a,
          lucro_atual: luc_a,
          margem_pct_atual: fat_a > 0 ? (luc_a / fat_a) * 100 : 0,
          faturamento_anterior: fat_p,
          lucro_anterior: luc_p,
          margem_pct_anterior: fat_p > 0 ? (luc_p / fat_p) * 100 : 0,
        };
      });

      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "granularity inválido" }, { status: 400 });
  } catch (err) {
    console.error("margem-yoy error:", err);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
