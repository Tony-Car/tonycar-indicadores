import { NextRequest, NextResponse } from "next/server";
import { getDb, buildFilterConditions, parseArrayParam } from "@/lib/db";

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
        COALESCE(io.area, 'Sem Area') AS area,
        COALESCE(io.grupo, 'Sem Grupo') AS grupo,
        COALESCE(io.subgrupo, 'Sem Subgrupo') AS subgrupo,
        SUM(io.valor_total_item) AS faturamento,
        COUNT(DISTINCT io.nk_orcamento) AS total_orcamentos
      FROM marts.itens_orcamento io
      INNER JOIN marts.orcamentos o ON io.nk_orcamento = o.nk_orcamento
      WHERE ${conditions.join(" AND ")}
        AND io.data_orcamento >= $1 AND io.data_orcamento <= $2
      GROUP BY 1, 2, 3
    `;

    const custoQuery = `
      SELECT
        COALESCE(io.area, 'Sem Area') AS area,
        COALESCE(io.grupo, 'Sem Grupo') AS grupo,
        COALESCE(io.subgrupo, 'Sem Subgrupo') AS subgrupo,
        SUM(io.custo_total_item) AS custo,
        SUM(io.lucro_bruto_total) AS lucro_bruto
      FROM marts.itens_orcamento io
      INNER JOIN marts.orcamentos o ON io.nk_orcamento = o.nk_orcamento
      WHERE ${[...conditions, "io.flag_custos_atualizados = true"].join(" AND ")}
        AND io.data_orcamento >= $1 AND io.data_orcamento <= $2
      GROUP BY 1, 2, 3
    `;

    const [fatRowsRaw, custoRowsRaw] = await Promise.all([
      db.query(fatQuery, [startDate, endDate, ...params]),
      db.query(custoQuery, [startDate, endDate, ...params]),
    ]);

    const fatRows = fatRowsRaw as unknown as Array<{
      area: string;
      grupo: string;
      subgrupo: string;
      faturamento: string;
      total_orcamentos: string;
    }>;

    const custoRows = custoRowsRaw as unknown as Array<{
      area: string;
      grupo: string;
      subgrupo: string;
      custo: string;
      lucro_bruto: string;
    }>;

    const custoMap = new Map<string, { custo: number; lucro_bruto: number }>();
    for (const r of custoRows) {
      custoMap.set(`${r.area}|${r.grupo}|${r.subgrupo}`, {
        custo: parseFloat(r.custo),
        lucro_bruto: parseFloat(r.lucro_bruto),
      });
    }

    const result = fatRows.map((r) => {
      const fat = parseFloat(r.faturamento);
      const custo = custoMap.get(`${r.area}|${r.grupo}|${r.subgrupo}`);
      return {
        area: r.area,
        grupo: r.grupo,
        subgrupo: r.subgrupo,
        faturamento: fat,
        custo: custo?.custo ?? null,
        lucro_bruto: custo?.lucro_bruto ?? null,
        margem_pct:
          custo && fat > 0 ? (custo.lucro_bruto / fat) * 100 : null,
        total_orcamentos: parseInt(r.total_orcamentos, 10),
      };
    });

    result.sort(
      (a, b) =>
        a.area.localeCompare(b.area) ||
        a.grupo.localeCompare(b.grupo) ||
        a.subgrupo.localeCompare(b.subgrupo)
    );

    return NextResponse.json(result);
  } catch (err) {
    console.error("itens-breakdown error:", err);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
