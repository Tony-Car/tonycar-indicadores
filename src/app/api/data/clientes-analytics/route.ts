import { NextRequest, NextResponse } from "next/server";
import { getDb, parseArrayParam } from "@/lib/db";

function buildClienteAnalyticsFilters(filters: {
  tipoItem: string[];
  mecanico: string[];
  area: string[];
  grupo: string[];
  subgrupo: string[];
  status: string[];
}) {
  const budgetConditions: string[] = [];
  const itemConditions: string[] = [];
  const params: unknown[] = [];
  let index = 3;

  if (filters.status.length > 0) {
    budgetConditions.push(`o.status = ANY($${index})`);
    params.push(filters.status);
    index += 1;
  } else {
    budgetConditions.push("o.flag_cancelado = false");
  }

  if (filters.mecanico.length > 0) {
    budgetConditions.push(`o.mecanico_responsavel = ANY($${index})`);
    params.push(filters.mecanico);
    index += 1;
  }

  if (filters.tipoItem.length > 0) {
    itemConditions.push(`io.tipo_item = ANY($${index})`);
    params.push(filters.tipoItem);
    index += 1;
  }

  if (filters.area.length > 0) {
    itemConditions.push(`io.area = ANY($${index})`);
    params.push(filters.area);
    index += 1;
  }

  if (filters.grupo.length > 0) {
    itemConditions.push(`io.grupo = ANY($${index})`);
    params.push(filters.grupo);
    index += 1;
  }

  if (filters.subgrupo.length > 0) {
    itemConditions.push(`io.subgrupo = ANY($${index})`);
    params.push(filters.subgrupo);
    index += 1;
  }

  return {
    budgetConditions,
    itemConditions,
    params,
  };
}

function buildFilteredOrcamentosCte(
  budgetConditions: string[],
  itemConditions: string[]
) {
  const whereConditions = [
    "o.data_orcamento >= $1",
    "o.data_orcamento <= $2",
    ...budgetConditions,
  ];

  const itemFilterClause =
    itemConditions.length > 0
      ? `
        AND EXISTS (
          SELECT 1
          FROM marts.itens_orcamento io
          WHERE io.nk_orcamento = o.nk_orcamento
            AND ${itemConditions.join(" AND ")}
        )
      `
      : "";

  return `
    WITH filtered_orcamentos AS (
      SELECT o.*
      FROM marts.clientes_orcamentos o
      WHERE ${whereConditions.join(" AND ")}
      ${itemFilterClause}
    )
  `;
}

function formatMonthLabel(month: string) {
  const normalizedMonth = month.slice(0, 10);

  return new Intl.DateTimeFormat("pt-BR", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  }).format(new Date(`${normalizedMonth}T00:00:00Z`));
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  if (!startDate || !endDate) {
    return NextResponse.json(
      { error: "startDate e endDate sao obrigatorios" },
      { status: 400 }
    );
  }

  const filters = {
    tipoItem: parseArrayParam(searchParams.get("tipoItem")),
    status: parseArrayParam(searchParams.get("status")),
    mecanico: parseArrayParam(searchParams.get("mecanico")),
    area: parseArrayParam(searchParams.get("area")),
    grupo: parseArrayParam(searchParams.get("grupo")),
    subgrupo: parseArrayParam(searchParams.get("subgrupo")),
  };

  try {
    const db = getDb();
    const { budgetConditions, itemConditions, params } =
      buildClienteAnalyticsFilters(filters);
    const filteredOrcamentosCte = buildFilteredOrcamentosCte(
      budgetConditions,
      itemConditions
    );
    const queryParams = [startDate, endDate, ...params];

    const summaryQuery = `
      ${filteredOrcamentosCte},
      clientes_ativos AS (
        SELECT
          fo.nome_cliente,
          MIN(fo.origem_cliente) AS origem_cliente,
          MIN(fo.data_primeiro_orcamento) AS data_primeiro_orcamento,
          SUM(fo.valor_total) AS faturamento_periodo,
          COUNT(*) AS orcamentos_periodo,
          AVG(fo.valor_total) AS ticket_medio_periodo,
          CASE WHEN COUNT(*) > 1 THEN
            AVG(fo.dias_desde_orcamento_anterior) FILTER (
              WHERE fo.dias_desde_orcamento_anterior IS NOT NULL
            )
          ELSE NULL
          END AS tempo_medio_periodo_dias
        FROM filtered_orcamentos fo
        GROUP BY fo.nome_cliente
      )
      SELECT
        COUNT(*) AS clientes_ativos,
        COUNT(*) FILTER (
          WHERE data_primeiro_orcamento >= $1
            AND data_primeiro_orcamento <= $2
        ) AS clientes_novos,
        COUNT(*) FILTER (
          WHERE data_primeiro_orcamento < $1
        ) AS clientes_antigos,
        COALESCE(SUM(faturamento_periodo), 0) AS faturamento_total_periodo,
        COALESCE(SUM(orcamentos_periodo), 0) AS total_orcamentos_periodo,
        COALESCE(AVG(ticket_medio_periodo), 0) AS ticket_medio_por_cliente_periodo,
        COALESCE(
          SUM(faturamento_periodo) / NULLIF(SUM(orcamentos_periodo), 0),
          0
        ) AS ticket_medio_geral_periodo,
        COALESCE(AVG(tempo_medio_periodo_dias), 0) AS tempo_medio_por_cliente_dias,
        COALESCE((
          SELECT AVG(fo.dias_desde_orcamento_anterior)
          FROM filtered_orcamentos fo
          WHERE fo.dias_desde_orcamento_anterior IS NOT NULL
            AND fo.nome_cliente IN (
              SELECT nome_cliente FROM filtered_orcamentos
              GROUP BY nome_cliente
              HAVING COUNT(*) > 1
            )
        ), 0) AS tempo_medio_geral_dias,
        COALESCE((
          SELECT AVG(cm.ltv_historico)
          FROM clientes_ativos ca
          INNER JOIN marts.clientes_metricas cm
            ON ca.nome_cliente = cm.nome_cliente
        ), 0) AS ltv_medio_historico
      FROM clientes_ativos
    `;

    const monthlyQuery = `
      ${filteredOrcamentosCte},
      clientes_mes AS (
        SELECT DISTINCT
          TO_CHAR(DATE_TRUNC('month', fo.data_orcamento)::date, 'YYYY-MM-DD') AS mes,
          fo.nome_cliente,
          fo.data_primeiro_orcamento
        FROM filtered_orcamentos fo
      )
      SELECT
        mes,
        COUNT(*) FILTER (
          WHERE DATE_TRUNC('month', data_primeiro_orcamento)::date = mes::date
        ) AS clientes_novos,
        COUNT(*) FILTER (
          WHERE DATE_TRUNC('month', data_primeiro_orcamento)::date < mes::date
        ) AS clientes_antigos,
        COUNT(*) AS clientes_ativos
      FROM clientes_mes
      GROUP BY mes
      ORDER BY mes
    `;

    const originsQuery = `
      ${filteredOrcamentosCte},
      clientes_ativos AS (
        SELECT
          fo.nome_cliente,
          MIN(COALESCE(fo.origem_cliente, 'Nao registrado')) AS origem_cliente,
          SUM(fo.valor_total) AS faturamento_periodo
        FROM filtered_orcamentos fo
        GROUP BY fo.nome_cliente
      )
      SELECT
        origem_cliente,
        COUNT(*) AS clientes_ativos,
        COALESCE(SUM(faturamento_periodo), 0) AS faturamento_periodo,
        COALESCE(AVG(faturamento_periodo), 0) AS faturamento_medio_por_cliente
      FROM clientes_ativos
      GROUP BY origem_cliente
      ORDER BY clientes_ativos DESC, faturamento_periodo DESC
    `;

    const clientsQuery = `
      ${filteredOrcamentosCte},
      clientes_ativos AS (
        SELECT
          fo.nome_cliente,
          MIN(COALESCE(fo.origem_cliente, 'Nao registrado')) AS origem_cliente,
          SUM(fo.valor_total) AS faturamento_periodo,
          COUNT(*) AS orcamentos_periodo,
          AVG(fo.valor_total) AS ticket_medio_periodo,
          CASE WHEN COUNT(*) > 1 THEN
            AVG(fo.dias_desde_orcamento_anterior) FILTER (
              WHERE fo.dias_desde_orcamento_anterior IS NOT NULL
            )
          ELSE NULL
          END AS tempo_medio_periodo_dias,
          MIN(fo.data_orcamento) AS primeiro_orcamento_periodo,
          MAX(fo.data_orcamento) AS ultimo_orcamento_periodo
        FROM filtered_orcamentos fo
        GROUP BY fo.nome_cliente
      )
      SELECT
        ca.nome_cliente,
        COALESCE(cm.origem_cliente, ca.origem_cliente) AS origem_cliente,
        cm.total_orcamentos,
        cm.ltv_historico,
        cm.ticket_medio_historico,
        cm.tempo_medio_entre_orcamentos_dias,
        ca.faturamento_periodo,
        ca.orcamentos_periodo,
        ca.ticket_medio_periodo,
        ca.tempo_medio_periodo_dias,
        cm.data_primeiro_orcamento,
        cm.data_ultimo_orcamento,
        ca.primeiro_orcamento_periodo,
        ca.ultimo_orcamento_periodo,
        CASE
          WHEN cm.data_primeiro_orcamento IS NOT NULL
          THEN (CURRENT_DATE - cm.data_primeiro_orcamento::date)
          ELSE NULL
        END AS tempo_como_cliente_dias
      FROM clientes_ativos ca
      LEFT JOIN marts.clientes_metricas cm
        ON ca.nome_cliente = cm.nome_cliente
      ORDER BY
        cm.ltv_historico DESC NULLS LAST,
        ca.faturamento_periodo DESC
      LIMIT 100
    `;

    const [
      summaryRowsRaw,
      monthlyRowsRaw,
      originsRowsRaw,
      clientsRowsRaw,
    ] = await Promise.all([
      db.query(summaryQuery, queryParams),
      db.query(monthlyQuery, queryParams),
      db.query(originsQuery, queryParams),
      db.query(clientsQuery, queryParams),
    ]);

    const summaryRows = summaryRowsRaw as unknown as Array<{
      clientes_ativos: string;
      clientes_novos: string;
      clientes_antigos: string;
      faturamento_total_periodo: string;
      total_orcamentos_periodo: string;
      ticket_medio_por_cliente_periodo: string;
      ticket_medio_geral_periodo: string;
      tempo_medio_por_cliente_dias: string;
      tempo_medio_geral_dias: string;
      ltv_medio_historico: string;
    }>;

    const monthlyRows = monthlyRowsRaw as unknown as Array<{
      mes: string;
      clientes_novos: string;
      clientes_antigos: string;
      clientes_ativos: string;
    }>;

    const originsRows = originsRowsRaw as unknown as Array<{
      origem_cliente: string;
      clientes_ativos: string;
      faturamento_periodo: string;
      faturamento_medio_por_cliente: string;
    }>;

    const clientsRows = clientsRowsRaw as unknown as Array<{
      nome_cliente: string;
      origem_cliente: string;
      total_orcamentos: string | null;
      ltv_historico: string | null;
      ticket_medio_historico: string | null;
      tempo_medio_entre_orcamentos_dias: string | null;
      faturamento_periodo: string;
      orcamentos_periodo: string;
      ticket_medio_periodo: string;
      tempo_medio_periodo_dias: string | null;
      data_primeiro_orcamento: string | null;
      data_ultimo_orcamento: string | null;
      primeiro_orcamento_periodo: string;
      ultimo_orcamento_periodo: string;
      tempo_como_cliente_dias: string | null;
    }>;

    const summary = summaryRows[0] ?? {
      clientes_ativos: "0",
      clientes_novos: "0",
      clientes_antigos: "0",
      faturamento_total_periodo: "0",
      total_orcamentos_periodo: "0",
      ticket_medio_por_cliente_periodo: "0",
      ticket_medio_geral_periodo: "0",
      tempo_medio_por_cliente_dias: "0",
      tempo_medio_geral_dias: "0",
      ltv_medio_historico: "0",
    };

    return NextResponse.json({
      summary: {
        clientes_ativos: Number(summary.clientes_ativos),
        clientes_novos: Number(summary.clientes_novos),
        clientes_antigos: Number(summary.clientes_antigos),
        faturamento_total_periodo: Number(summary.faturamento_total_periodo),
        total_orcamentos_periodo: Number(summary.total_orcamentos_periodo),
        ticket_medio_por_cliente_periodo: Number(
          summary.ticket_medio_por_cliente_periodo
        ),
        ticket_medio_geral_periodo: Number(summary.ticket_medio_geral_periodo),
        tempo_medio_por_cliente_dias: Number(summary.tempo_medio_por_cliente_dias),
        tempo_medio_geral_dias: Number(summary.tempo_medio_geral_dias),
        ltv_medio_historico: Number(summary.ltv_medio_historico),
      },
      monthly: monthlyRows.map((row) => ({
        month: row.mes,
        label: formatMonthLabel(row.mes),
        clientes_novos: Number(row.clientes_novos),
        clientes_antigos: Number(row.clientes_antigos),
        clientes_ativos: Number(row.clientes_ativos),
      })),
      origins: originsRows.map((row) => ({
        origem_cliente: row.origem_cliente,
        clientes_ativos: Number(row.clientes_ativos),
        faturamento_periodo: Number(row.faturamento_periodo),
        faturamento_medio_por_cliente: Number(
          row.faturamento_medio_por_cliente
        ),
      })),
      clients: clientsRows.map((row) => ({
        nome_cliente: row.nome_cliente,
        origem_cliente: row.origem_cliente,
        total_orcamentos: row.total_orcamentos
          ? Number(row.total_orcamentos)
          : null,
        ltv_historico: row.ltv_historico ? Number(row.ltv_historico) : null,
        ticket_medio_historico: row.ticket_medio_historico
          ? Number(row.ticket_medio_historico)
          : null,
        tempo_medio_entre_orcamentos_dias:
          row.tempo_medio_entre_orcamentos_dias
            ? Number(row.tempo_medio_entre_orcamentos_dias)
            : null,
        faturamento_periodo: Number(row.faturamento_periodo),
        orcamentos_periodo: Number(row.orcamentos_periodo),
        ticket_medio_periodo: Number(row.ticket_medio_periodo),
        tempo_medio_periodo_dias: row.tempo_medio_periodo_dias
          ? Number(row.tempo_medio_periodo_dias)
          : null,
        data_primeiro_orcamento: row.data_primeiro_orcamento,
        data_ultimo_orcamento: row.data_ultimo_orcamento,
        primeiro_orcamento_periodo: row.primeiro_orcamento_periodo,
        ultimo_orcamento_periodo: row.ultimo_orcamento_periodo,
        tempo_como_cliente_dias: row.tempo_como_cliente_dias
          ? Number(row.tempo_como_cliente_dias)
          : null,
      })),
    });
  } catch (err) {
    console.error("clientes-analytics error:", err);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
