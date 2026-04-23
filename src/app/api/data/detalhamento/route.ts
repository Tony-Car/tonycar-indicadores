import { NextRequest, NextResponse } from "next/server";
import { getDb, buildFilterConditions, parseArrayParam } from "@/lib/db";

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const anoAtual = parseInt(sp.get("anoAtual") || String(new Date().getFullYear()));

  const filters = {
    tipoItem: parseArrayParam(sp.get("tipoItem")),
    mecanico: parseArrayParam(sp.get("mecanico")),
    area: parseArrayParam(sp.get("area")),
    grupo: parseArrayParam(sp.get("grupo")),
    subgrupo: parseArrayParam(sp.get("subgrupo")),
  };

  try {
    const db = getDb();
    const { conditions, params } = buildFilterConditions(filters, 2);

    // Faturamento (all data)
    const fatQuery = `
      SELECT
        COALESCE(io.area, 'Sem Área') AS area,
        COALESCE(io.grupo, 'Sem Grupo') AS grupo,
        COALESCE(io.subgrupo, 'Sem Subgrupo') AS subgrupo,
        io.descricao_item,
        SUM(io.valor_total_item) AS faturamento
      FROM marts.itens_orcamento io
      INNER JOIN marts.orcamentos o ON io.nk_orcamento = o.nk_orcamento
      WHERE ${conditions.join(" AND ")}
        AND EXTRACT(YEAR FROM io.data_orcamento) = $1
      GROUP BY 1, 2, 3, 4
    `;

    // Costs (only where flag_custos_atualizados = true)
    const custoConditions = [...conditions, "io.flag_custos_atualizados = true"];
    const custoQuery = `
      SELECT
        COALESCE(io.area, 'Sem Área') AS area,
        COALESCE(io.grupo, 'Sem Grupo') AS grupo,
        COALESCE(io.subgrupo, 'Sem Subgrupo') AS subgrupo,
        io.descricao_item,
        SUM(io.custo_total_item) AS custo,
        SUM(io.lucro_bruto_total) AS lucro
      FROM marts.itens_orcamento io
      INNER JOIN marts.orcamentos o ON io.nk_orcamento = o.nk_orcamento
      WHERE ${custoConditions.join(" AND ")}
        AND EXTRACT(YEAR FROM io.data_orcamento) = $1
      GROUP BY 1, 2, 3, 4
    `;

    const [fatRows, custoRows] = await Promise.all([
      db(fatQuery, [anoAtual, ...params]) as Promise<Array<{
        area: string; grupo: string; subgrupo: string;
        descricao_item: string; faturamento: string;
      }>>,
      db(custoQuery, [anoAtual, ...params]) as Promise<Array<{
        area: string; grupo: string; subgrupo: string;
        descricao_item: string; custo: string; lucro: string;
      }>>,
    ]);

    // Create a lookup for cost data
    const custoMap = new Map<string, { custo: number; lucro: number }>();
    for (const r of custoRows) {
      const key = `${r.area}|${r.grupo}|${r.subgrupo}|${r.descricao_item}`;
      custoMap.set(key, { custo: parseFloat(r.custo), lucro: parseFloat(r.lucro) });
    }

    const result = fatRows.map((r) => {
      const key = `${r.area}|${r.grupo}|${r.subgrupo}|${r.descricao_item}`;
      const custo = custoMap.get(key);
      const fat = parseFloat(r.faturamento);
      return {
        area: r.area,
        grupo: r.grupo,
        subgrupo: r.subgrupo,
        descricao_item: r.descricao_item,
        faturamento: fat,
        custo: custo?.custo ?? null,
        lucro: custo?.lucro ?? null,
        margem_pct: custo && fat > 0 ? (custo.lucro / fat) * 100 : null,
        tem_custo: !!custo,
      };
    });

    result.sort((a, b) =>
      a.area.localeCompare(b.area) ||
      a.grupo.localeCompare(b.grupo) ||
      a.subgrupo.localeCompare(b.subgrupo) ||
      a.descricao_item.localeCompare(b.descricao_item)
    );

    return NextResponse.json(result);
  } catch (err) {
    console.error("detalhamento error:", err);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
