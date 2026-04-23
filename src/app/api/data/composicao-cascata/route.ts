import { NextRequest, NextResponse } from "next/server";
import { getDb, buildFilterConditions, parseArrayParam } from "@/lib/db";

type GroupByKey = "tipo_item" | "area" | "grupo" | "subgrupo" | "mecanico";

const GROUP_BY_CONFIG: Record<
  GroupByKey,
  { expression: string; label: string }
> = {
  tipo_item: {
    expression: "COALESCE(io.tipo_item, 'Sem tipo de item')",
    label: "Tipo de item",
  },
  area: {
    expression: "COALESCE(io.area, 'Sem area')",
    label: "Area",
  },
  grupo: {
    expression: "COALESCE(io.grupo, 'Sem grupo')",
    label: "Grupo",
  },
  subgrupo: {
    expression: "COALESCE(io.subgrupo, 'Sem subgrupo')",
    label: "Subgrupo",
  },
  mecanico: {
    expression: "COALESCE(o.mecanico_responsavel, 'Nao informado')",
    label: "Mecanico",
  },
};

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const startDate = sp.get("startDate");
  const endDate = sp.get("endDate");
  const requestedGroupBy = sp.get("groupBy") as GroupByKey | null;
  const groupBy: GroupByKey =
    requestedGroupBy && requestedGroupBy in GROUP_BY_CONFIG
      ? requestedGroupBy
      : "tipo_item";

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
    const { conditions, params } = buildFilterConditions(filters, 3);
    const allConditions = [...conditions, "io.flag_custos_atualizados = true"];
    const groupExpression = GROUP_BY_CONFIG[groupBy].expression;

    const query = `
      SELECT
        ${groupExpression} AS label,
        COALESCE(SUM(io.valor_total_item), 0) AS entradas,
        COALESCE(SUM(io.custo_total_item), 0) AS saidas,
        COALESCE(SUM(io.lucro_bruto_total), 0) AS saldo
      FROM marts.itens_orcamento io
      INNER JOIN marts.orcamentos o ON io.nk_orcamento = o.nk_orcamento
      WHERE ${allConditions.join(" AND ")}
        AND io.data_orcamento >= $1 AND io.data_orcamento <= $2
      GROUP BY 1
      HAVING COALESCE(SUM(io.valor_total_item), 0) <> 0
        OR COALESCE(SUM(io.custo_total_item), 0) <> 0
        OR COALESCE(SUM(io.lucro_bruto_total), 0) <> 0
      ORDER BY GREATEST(
        ABS(SUM(io.valor_total_item)),
        ABS(SUM(io.custo_total_item)),
        ABS(SUM(io.lucro_bruto_total))
      ) DESC
    `;

    const rows = (await db.query(query, [
      startDate,
      endDate,
      ...params,
    ])) as unknown as Array<{
      label: string;
      entradas: string;
      saidas: string;
      saldo: string;
    }>;

    const parsedRows = rows.map((row) => ({
      label: row.label,
      entradas: parseFloat(row.entradas),
      saidas: parseFloat(row.saidas),
      saldo: parseFloat(row.saldo),
    }));

    const totals = parsedRows.reduce(
      (acc, row) => ({
        entradas: acc.entradas + row.entradas,
        saidas: acc.saidas + row.saidas,
        saldo: acc.saldo + row.saldo,
      }),
      { entradas: 0, saidas: 0, saldo: 0 }
    );

    return NextResponse.json({
      groupBy,
      groupLabel: GROUP_BY_CONFIG[groupBy].label,
      rows: parsedRows,
      totals,
    });
  } catch (err) {
    console.error("composicao-cascata error:", err);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
