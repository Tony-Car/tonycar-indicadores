import { NextRequest, NextResponse } from "next/server";
import { getDb, buildFilterConditions, parseArrayParam } from "@/lib/db";
import { getPreviousYearRange } from "@/lib/period";

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const startDate = sp.get("startDate");
  const endDate = sp.get("endDate");

  if (!startDate || !endDate) {
    return NextResponse.json(
      { error: "startDate e endDate sao obrigatorios" },
      { status: 400 }
    );
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
    const { startDate: comparisonStartDate, endDate: comparisonEndDate } =
      getPreviousYearRange(startDate, endDate);

    const query = `
      WITH base AS (
        SELECT
          CASE
            WHEN io.data_orcamento >= $1 AND io.data_orcamento <= $2 THEN 'atual'
            WHEN io.data_orcamento >= $3 AND io.data_orcamento <= $4 THEN 'anterior'
          END AS periodo,
          COALESCE(o.mecanico_responsavel, 'Nao Informado') AS mecanico,
          SUM(io.valor_total_item) AS faturamento
        FROM marts.itens_orcamento io
        INNER JOIN marts.orcamentos o ON io.nk_orcamento = o.nk_orcamento
        WHERE ${conditions.join(" AND ")}
          AND (
            (io.data_orcamento >= $1 AND io.data_orcamento <= $2) OR
            (io.data_orcamento >= $3 AND io.data_orcamento <= $4)
          )
        GROUP BY 1, 2
      )
      SELECT
        mecanico,
        COALESCE(SUM(CASE WHEN periodo = 'atual' THEN faturamento END), 0) AS faturamento_atual,
        COALESCE(SUM(CASE WHEN periodo = 'anterior' THEN faturamento END), 0) AS faturamento_anterior
      FROM base
      GROUP BY 1
      ORDER BY faturamento_atual DESC, faturamento_anterior DESC
      LIMIT 15
    `;

    const rows = (await db.query(query, [
      startDate,
      endDate,
      comparisonStartDate,
      comparisonEndDate,
      ...params,
    ])) as unknown as Array<{
      mecanico: string;
      faturamento_atual: string;
      faturamento_anterior: string;
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
