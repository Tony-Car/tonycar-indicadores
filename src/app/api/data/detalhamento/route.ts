import { NextRequest, NextResponse } from "next/server";
import { getDb, buildFilterConditions, parseArrayParam } from "@/lib/db";

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const startDate = sp.get("startDate");
  const endDate = sp.get("endDate");

  if (!startDate || !endDate) {
    return NextResponse.json({ error: "startDate e endDate são obrigatórios" }, { status: 400 });
  }

  const filters = {
    tipoItem: parseArrayParam(sp.get("tipoItem")),
    status: parseArrayParam(sp.get("status")),
    mecanico: parseArrayParam(sp.get("mecanico")),
    area: parseArrayParam(sp.get("area")),
    grupo: parseArrayParam(sp.get("grupo")),
    subgrupo: parseArrayParam(sp.get("subgrupo")),
  };

  try {
    const db = getDb();
    const { conditions, params } = buildFilterConditions(filters, 3);

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
        AND io.data_orcamento >= $1 AND io.data_orcamento <= $2
      GROUP BY 1, 2, 3, 4
    `;

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
        AND io.data_orcamento >= $1 AND io.data_orcamento <= $2
      GROUP BY 1, 2, 3, 4
    `;

    // Executamos sem casting no Promise.all
    const [fatRowsRaw, custoRowsRaw] = await Promise.all([
      db.query(fatQuery, [startDate, endDate, ...params]),
      db.query(custoQuery, [startDate, endDate, ...params]),
    ]);

    // Casting dos resultados após o await
    const fatRows = fatRowsRaw as unknown as Array<{
      area: string; grupo: string; subgrupo: string;
      descricao_item: string; faturamento: string;
    }>;

    const custoRows = custoRowsRaw as unknown as Array<{
      area: string; grupo: string; subgrupo: string;
      descricao_item: string; custo: string; lucro: string;
    }>;

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
