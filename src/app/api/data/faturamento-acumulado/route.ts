import { NextRequest, NextResponse } from "next/server";
import { getDb, buildFilterConditions, parseArrayParam } from "@/lib/db";
import { getPreviousYearRange } from "@/lib/period";

const MESES = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

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
      WITH current_months AS (
        SELECT
          generate_series(
            date_trunc('month', $1::date),
            date_trunc('month', $2::date),
            interval '1 month'
          )::date AS month_start
      ),
      current_data AS (
        SELECT
          date_trunc('month', io.data_orcamento)::date AS month_start,
          SUM(io.valor_total_item) AS faturamento
        FROM marts.itens_orcamento io
        INNER JOIN marts.orcamentos o ON io.nk_orcamento = o.nk_orcamento
        WHERE ${conditions.join(" AND ")}
          AND io.data_orcamento >= $1 AND io.data_orcamento <= $2
        GROUP BY 1
      ),
      previous_data AS (
        SELECT
          (date_trunc('month', io.data_orcamento) + interval '1 year')::date AS month_start,
          SUM(io.valor_total_item) AS faturamento
        FROM marts.itens_orcamento io
        INNER JOIN marts.orcamentos o ON io.nk_orcamento = o.nk_orcamento
        WHERE ${conditions.join(" AND ")}
          AND io.data_orcamento >= $3 AND io.data_orcamento <= $4
        GROUP BY 1
      )
      SELECT
        EXTRACT(YEAR FROM cm.month_start)::int AS ano,
        EXTRACT(MONTH FROM cm.month_start)::int AS mes,
        COALESCE(cd.faturamento, 0) AS faturamento_atual,
        COALESCE(pd.faturamento, 0) AS faturamento_anterior
      FROM current_months cm
      LEFT JOIN current_data cd ON cd.month_start = cm.month_start
      LEFT JOIN previous_data pd ON pd.month_start = cm.month_start
      ORDER BY cm.month_start
    `;

    const rows = (await db.query(query, [
      startDate,
      endDate,
      comparisonStartDate,
      comparisonEndDate,
      ...params,
    ])) as unknown as Array<{
      ano: number;
      mes: number;
      faturamento_atual: string;
      faturamento_anterior: string;
    }>;

    let acumuladoAtual = 0;
    let acumuladoAnterior = 0;

    const result = rows.map((r) => {
      const faturamentoAtual = parseFloat(r.faturamento_atual);
      const faturamentoAnterior = parseFloat(r.faturamento_anterior);

      acumuladoAtual += faturamentoAtual;
      acumuladoAnterior += faturamentoAnterior;

      return {
        mes: r.mes,
        label:
          rows.length > 12
            ? `${MESES[r.mes - 1]}/${String(r.ano).slice(2)}`
            : MESES[r.mes - 1],
        faturamento_atual: faturamentoAtual,
        faturamento_anterior: faturamentoAnterior,
        acumulado_atual: acumuladoAtual,
        acumulado_anterior: acumuladoAnterior,
      };
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("faturamento-acumulado error:", err);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
