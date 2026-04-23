import { NextRequest, NextResponse } from "next/server";
import { getDb, buildFilterConditions, parseArrayParam } from "@/lib/db";

const MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const granularity = sp.get("granularity") || "mensal";
  const anoAtual = parseInt(sp.get("anoAtual") || String(new Date().getFullYear()));
  const anoAnterior = anoAtual - 1;

  const filters = {
    tipoItem: parseArrayParam(sp.get("tipoItem")),
    mecanico: parseArrayParam(sp.get("mecanico")),
    area: parseArrayParam(sp.get("area")),
    grupo: parseArrayParam(sp.get("grupo")),
    subgrupo: parseArrayParam(sp.get("subgrupo")),
  };

  try {
    const db = getDb();
    const { conditions, params } = buildFilterConditions(filters, 3);
    // Margin only available where flag_custos_atualizados = true
    const allConditions = [...conditions, "io.flag_custos_atualizados = true"];

    if (granularity === "mensal") {
      const query = `
        WITH base AS (
          SELECT
            EXTRACT(YEAR FROM io.data_orcamento)::int AS ano,
            EXTRACT(MONTH FROM io.data_orcamento)::int AS mes,
            SUM(io.valor_total_item) AS faturamento,
            SUM(io.lucro_bruto_total) AS lucro
          FROM marts.itens_orcamento io
          INNER JOIN marts.orcamentos o ON io.nk_orcamento = o.nk_orcamento
          WHERE ${allConditions.join(" AND ")}
            AND EXTRACT(YEAR FROM io.data_orcamento) IN ($1, $2)
          GROUP BY 1, 2
        )
        SELECT
          mes,
          COALESCE(SUM(CASE WHEN ano = $1 THEN faturamento END), 0) AS faturamento_atual,
          COALESCE(SUM(CASE WHEN ano = $1 THEN lucro END), 0) AS lucro_atual,
          COALESCE(SUM(CASE WHEN ano = $2 THEN faturamento END), 0) AS faturamento_anterior,
          COALESCE(SUM(CASE WHEN ano = $2 THEN lucro END), 0) AS lucro_anterior
        FROM base
        GROUP BY mes
        ORDER BY mes
      `;

      const rows = await db.query(query, [anoAtual, anoAnterior, ...params]) as Array<{
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
            EXTRACT(YEAR FROM io.data_orcamento)::int AS ano,
            EXTRACT(WEEK FROM io.data_orcamento)::int AS semana_num,
            DATE_TRUNC('week', io.data_orcamento)::date AS semana_inicio,
            SUM(io.valor_total_item) AS faturamento,
            SUM(io.lucro_bruto_total) AS lucro
          FROM marts.itens_orcamento io
          INNER JOIN marts.orcamentos o ON io.nk_orcamento = o.nk_orcamento
          WHERE ${allConditions.join(" AND ")}
            AND EXTRACT(YEAR FROM io.data_orcamento) IN ($1, $2)
          GROUP BY 1, 2, 3
        )
        SELECT
          semana_num,
          MAX(CASE WHEN ano = $1 THEN semana_inicio END) AS semana_inicio_atual,
          COALESCE(SUM(CASE WHEN ano = $1 THEN faturamento END), 0) AS faturamento_atual,
          COALESCE(SUM(CASE WHEN ano = $1 THEN lucro END), 0) AS lucro_atual,
          COALESCE(SUM(CASE WHEN ano = $2 THEN faturamento END), 0) AS faturamento_anterior,
          COALESCE(SUM(CASE WHEN ano = $2 THEN lucro END), 0) AS lucro_anterior
        FROM base
        GROUP BY semana_num
        ORDER BY semana_num
      `;

      const rows = await db.query(query, [anoAtual, anoAnterior, ...params]) as Array<{
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
