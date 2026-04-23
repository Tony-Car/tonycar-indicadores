import { NextRequest, NextResponse } from "next/server";
import { getDb, buildFilterConditions, parseArrayParam } from "@/lib/db";

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
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

    const query = `
      WITH base AS (
        SELECT
          EXTRACT(YEAR FROM io.data_orcamento)::int AS ano,
          COALESCE(o.mecanico_responsavel, 'Não Informado') AS mecanico,
          SUM(io.valor_total_item) AS faturamento
        FROM marts.itens_orcamento io
        INNER JOIN marts.orcamentos o ON io.nk_orcamento = o.nk_orcamento
        WHERE ${conditions.join(" AND ")}
          AND EXTRACT(YEAR FROM io.data_orcamento) IN ($1, $2)
        GROUP BY 1, 2
      )
      SELECT
        mecanico,
        COALESCE(SUM(CASE WHEN ano = $1 THEN faturamento END), 0) AS faturamento_atual,
        COALESCE(SUM(CASE WHEN ano = $2 THEN faturamento END), 0) AS faturamento_anterior
      FROM base
      GROUP BY mecanico
      ORDER BY faturamento_atual DESC
      LIMIT 15
    `;

    const rows = await db(query, [anoAtual, anoAnterior, ...params]) as Array<{
      mecanico: string; faturamento_atual: string; faturamento_anterior: string;
    }>;

    const result = rows.map((r) => ({
      mecanico: r.mecanico,
      faturamento_atual: parseFloat(r.faturamento_atual),
      faturamento_anterior: parseFloat(r.faturamento_anterior),
    }));

    return NextResponse.json(result);
  } catch (err) {
    console.error("faturamento-mecanico error:", err);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
