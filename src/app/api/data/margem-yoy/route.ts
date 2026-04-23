import { NextRequest, NextResponse } from "next/server";
import { getDb, buildFilterConditions, parseArrayParam } from "@/lib/db";
import {
  formatMonthBucketLabel,
  getPreviousYearRange,
  spansMultipleCalendarYears,
} from "@/lib/period";

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const granularity = sp.get("granularity") || "mensal";

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
    const allConditions = [...conditions, "io.flag_custos_atualizados = true"];

    const pAtualStart = startDate;
    const pAtualEnd = endDate;
    const { startDate: pAntS, endDate: pAntE } = getPreviousYearRange(
      startDate,
      endDate
    );
    const includeYearInLabels = spansMultipleCalendarYears(startDate, endDate);

    if (granularity === "mensal") {
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
            SUM(io.valor_total_item) AS faturamento,
            SUM(io.lucro_bruto_total) AS lucro
          FROM marts.itens_orcamento io
          INNER JOIN marts.orcamentos o ON io.nk_orcamento = o.nk_orcamento
          WHERE ${allConditions.join(" AND ")}
            AND io.data_orcamento >= $1 AND io.data_orcamento <= $2
          GROUP BY 1
        ),
        previous_data AS (
          SELECT
            (date_trunc('month', io.data_orcamento) + interval '1 year')::date AS month_start,
            SUM(io.valor_total_item) AS faturamento,
            SUM(io.lucro_bruto_total) AS lucro
          FROM marts.itens_orcamento io
          INNER JOIN marts.orcamentos o ON io.nk_orcamento = o.nk_orcamento
          WHERE ${allConditions.join(" AND ")}
            AND io.data_orcamento >= $3 AND io.data_orcamento <= $4
          GROUP BY 1
        )
        SELECT
          cm.month_start,
          COALESCE(cd.faturamento, 0) AS faturamento_atual,
          COALESCE(cd.lucro, 0) AS lucro_atual,
          COALESCE(pd.faturamento, 0) AS faturamento_anterior,
          COALESCE(pd.lucro, 0) AS lucro_anterior
        FROM current_months cm
        LEFT JOIN current_data cd ON cd.month_start = cm.month_start
        LEFT JOIN previous_data pd ON pd.month_start = cm.month_start
        ORDER BY cm.month_start
      `;

      const rows = (await db.query(query, [
        pAtualStart,
        pAtualEnd,
        pAntS,
        pAntE,
        ...params,
      ])) as unknown as Array<{
        month_start: string;
        faturamento_atual: string;
        lucro_atual: string;
        faturamento_anterior: string;
        lucro_anterior: string;
      }>;

      const result = rows.map((r) => {
        const fatAtual = parseFloat(r.faturamento_atual);
        const lucroAtual = parseFloat(r.lucro_atual);
        const fatAnterior = parseFloat(r.faturamento_anterior);
        const lucroAnterior = parseFloat(r.lucro_anterior);

        return {
          label: formatMonthBucketLabel(r.month_start, includeYearInLabels),
          faturamento_atual: fatAtual,
          lucro_atual: lucroAtual,
          margem_pct_atual: fatAtual > 0 ? (lucroAtual / fatAtual) * 100 : 0,
          faturamento_anterior: fatAnterior,
          lucro_anterior: lucroAnterior,
          margem_pct_anterior:
            fatAnterior > 0 ? (lucroAnterior / fatAnterior) * 100 : 0,
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

      const rows = (await db.query(query, [
        pAtualStart,
        pAtualEnd,
        pAntS,
        pAntE,
        ...params,
      ])) as unknown as Array<{
        semana_num: number;
        semana_inicio_atual: string | null;
        faturamento_atual: string;
        lucro_atual: string;
        faturamento_anterior: string;
        lucro_anterior: string;
      }>;

      const result = rows.map((r) => {
        let label = `S${r.semana_num}`;

        if (r.semana_inicio_atual) {
          const d = new Date(r.semana_inicio_atual);
          label = `${String(d.getUTCDate()).padStart(2, "0")}/${String(
            d.getUTCMonth() + 1
          ).padStart(2, "0")}`;
        }

        const fatAtual = parseFloat(r.faturamento_atual);
        const lucroAtual = parseFloat(r.lucro_atual);
        const fatAnterior = parseFloat(r.faturamento_anterior);
        const lucroAnterior = parseFloat(r.lucro_anterior);

        return {
          label,
          faturamento_atual: fatAtual,
          lucro_atual: lucroAtual,
          margem_pct_atual: fatAtual > 0 ? (lucroAtual / fatAtual) * 100 : 0,
          faturamento_anterior: fatAnterior,
          lucro_anterior: lucroAnterior,
          margem_pct_anterior:
            fatAnterior > 0 ? (lucroAnterior / fatAnterior) * 100 : 0,
        };
      });

      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "granularity invalido" }, { status: 400 });
  } catch (err) {
    console.error("margem-yoy error:", err);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
