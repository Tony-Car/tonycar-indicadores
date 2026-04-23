import { NextRequest, NextResponse } from "next/server";
import { getDb, buildFilterConditions, parseArrayParam } from "@/lib/db";

const MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const granularity = sp.get("granularity") || "mensal";
  const anoAtual = parseInt(sp.get("anoAtual") || String(new Date().getFullYear()));
  const anoAnterior = anoAtual - 1;
  const mes = parseInt(sp.get("mes") || String(new Date().getMonth() + 1));

  const filters = {
    tipoItem: parseArrayParam(sp.get("tipoItem")),
    mecanico: parseArrayParam(sp.get("mecanico")),
    area: parseArrayParam(sp.get("area")),
    grupo: parseArrayParam(sp.get("grupo")),
    subgrupo: parseArrayParam(sp.get("subgrupo")),
  };

  try {
    const db = getDb();

    if (granularity === "mensal") {
      const { conditions, params, nextIdx } = buildFilterConditions(filters, 3);
      const query = `
        WITH base AS (
          SELECT
            EXTRACT(YEAR FROM io.data_orcamento)::int AS ano,
            EXTRACT(MONTH FROM io.data_orcamento)::int AS mes,
            SUM(io.valor_total_item) AS faturamento
          FROM marts.itens_orcamento io
          INNER JOIN marts.orcamentos o ON io.nk_orcamento = o.nk_orcamento
          WHERE ${conditions.join(" AND ")}
            AND EXTRACT(YEAR FROM io.data_orcamento) IN ($1, $2)
          GROUP BY 1, 2
        )
        SELECT
          mes,
          COALESCE(SUM(CASE WHEN ano = $1 THEN faturamento END), 0) AS faturamento_atual,
          COALESCE(SUM(CASE WHEN ano = $2 THEN faturamento END), 0) AS faturamento_anterior
        FROM base
        GROUP BY mes
        ORDER BY mes
      `;
      const rows = await db(query, [anoAtual, anoAnterior, ...params]) as Array<{
        mes: number; faturamento_atual: string; faturamento_anterior: string;
      }>;

      const result = rows.map((r) => ({
        label: MESES[r.mes - 1],
        faturamento_atual: parseFloat(r.faturamento_atual),
        faturamento_anterior: parseFloat(r.faturamento_anterior),
      }));

      return NextResponse.json(result);
    }

    if (granularity === "semanal") {
      const { conditions, params, nextIdx } = buildFilterConditions(filters, 3);
      const query = `
        WITH base AS (
          SELECT
            EXTRACT(YEAR FROM io.data_orcamento)::int AS ano,
            EXTRACT(WEEK FROM io.data_orcamento)::int AS semana_num,
            DATE_TRUNC('week', io.data_orcamento)::date AS semana_inicio,
            SUM(io.valor_total_item) AS faturamento
          FROM marts.itens_orcamento io
          INNER JOIN marts.orcamentos o ON io.nk_orcamento = o.nk_orcamento
          WHERE ${conditions.join(" AND ")}
            AND EXTRACT(YEAR FROM io.data_orcamento) IN ($1, $2)
          GROUP BY 1, 2, 3
        )
        SELECT
          semana_num,
          MAX(CASE WHEN ano = $1 THEN semana_inicio END) AS semana_inicio_atual,
          COALESCE(SUM(CASE WHEN ano = $1 THEN faturamento END), 0) AS faturamento_atual,
          COALESCE(SUM(CASE WHEN ano = $2 THEN faturamento END), 0) AS faturamento_anterior
        FROM base
        GROUP BY semana_num
        ORDER BY semana_num
      `;
      const rows = await db(query, [anoAtual, anoAnterior, ...params]) as Array<{
        semana_num: number; semana_inicio_atual: string | null;
        faturamento_atual: string; faturamento_anterior: string;
      }>;

      const result = rows.map((r) => {
        let label = `S${r.semana_num}`;
        if (r.semana_inicio_atual) {
          const d = new Date(r.semana_inicio_atual);
          label = `${String(d.getUTCDate()).padStart(2,"0")}/${String(d.getUTCMonth()+1).padStart(2,"0")}`;
        }
        return {
          label,
          faturamento_atual: parseFloat(r.faturamento_atual),
          faturamento_anterior: parseFloat(r.faturamento_anterior),
        };
      });

      return NextResponse.json(result);
    }

    if (granularity === "diario") {
      const { conditions, params } = buildFilterConditions(filters, 3);
      const query = `
        WITH base AS (
          SELECT
            EXTRACT(YEAR FROM io.data_orcamento)::int AS ano,
            io.data_orcamento,
            SUM(io.valor_total_item) AS faturamento
          FROM marts.itens_orcamento io
          INNER JOIN marts.orcamentos o ON io.nk_orcamento = o.nk_orcamento
          WHERE ${conditions.join(" AND ")}
            AND EXTRACT(YEAR FROM io.data_orcamento) IN ($1, $2)
            AND EXTRACT(MONTH FROM io.data_orcamento) = $3
          GROUP BY 1, 2
        )
        SELECT
          d.data_orcamento,
          COALESCE(SUM(CASE WHEN d.ano = $1 THEN d.faturamento END), 0) AS faturamento_atual,
          COALESCE(SUM(CASE WHEN d.ano = $2 THEN d.faturamento END), 0) AS faturamento_anterior
        FROM (
          SELECT DISTINCT data_orcamento, ano FROM base
        ) d
        GROUP BY d.data_orcamento
        ORDER BY d.data_orcamento
      `;
      const rows = await db(query, [anoAtual, anoAnterior, mes, ...params]) as Array<{
        data_orcamento: string; faturamento_atual: string; faturamento_anterior: string;
      }>;

      const result = rows.map((r) => {
        const d = new Date(r.data_orcamento);
        return {
          label: `${String(d.getUTCDate()).padStart(2,"0")}/${String(d.getUTCMonth()+1).padStart(2,"0")}`,
          faturamento_atual: parseFloat(r.faturamento_atual),
          faturamento_anterior: parseFloat(r.faturamento_anterior),
        };
      });

      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "granularity inválido" }, { status: 400 });
  } catch (err) {
    console.error("faturamento-yoy error:", err);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
