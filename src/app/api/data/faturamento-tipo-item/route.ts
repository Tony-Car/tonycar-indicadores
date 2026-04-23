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
          io.tipo_item,
          EXTRACT(YEAR FROM io.data_orcamento)::int AS ano,
          SUM(io.valor_total_item) AS faturamento
        FROM marts.itens_orcamento io
        INNER JOIN marts.orcamentos o ON io.nk_orcamento = o.nk_orcamento
        WHERE ${conditions.join(" AND ")}
          AND EXTRACT(YEAR FROM io.data_orcamento) IN ($1, $2)
          AND io.tipo_item IS NOT NULL
        GROUP BY 1, 2
      )
      SELECT
        tipo_item,
        COALESCE(SUM(CASE WHEN ano = $1 THEN faturamento END), 0) AS faturamento_atual,
        COALESCE(SUM(CASE WHEN ano = $2 THEN faturamento END), 0) AS faturamento_anterior
      FROM base
      GROUP BY tipo_item
      ORDER BY faturamento_atual DESC
    `;

    const rows = await db.query(query, [anoAtual, anoAnterior, ...params]) as Array<{
      tipo_item: string; faturamento_atual: string; faturamento_anterior: string;
    }>;

    return NextResponse.json(
      rows.map((r) => ({
        tipo_item: r.tipo_item,
        faturamento_atual: parseFloat(r.faturamento_atual),
        faturamento_anterior: parseFloat(r.faturamento_anterior),
      }))
    );
  } catch (err) {
    console.error("faturamento-tipo-item error:", err);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
