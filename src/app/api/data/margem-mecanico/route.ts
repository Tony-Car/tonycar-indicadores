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
    const allConditions = [...conditions, "io.flag_custos_atualizados = true"];

    const query = `
      SELECT
        COALESCE(o.mecanico_responsavel, 'Não Informado') AS mecanico,
        SUM(io.valor_total_item) AS faturamento,
        SUM(io.lucro_bruto_total) AS lucro
      FROM marts.itens_orcamento io
      INNER JOIN marts.orcamentos o ON io.nk_orcamento = o.nk_orcamento
      WHERE ${allConditions.join(" AND ")}
        AND EXTRACT(YEAR FROM io.data_orcamento) = $1
      GROUP BY 1
      ORDER BY lucro DESC
    `;

    const rows = await db.query(query, [anoAtual, ...params]) as Array<{
      mecanico: string; faturamento: string; lucro: string;
    }>;

    const result = rows.map((r) => {
      const fat = parseFloat(r.faturamento);
      const luc = parseFloat(r.lucro);
      return {
        mecanico: r.mecanico,
        faturamento: fat,
        lucro: luc,
        margem_pct: fat > 0 ? (luc / fat) * 100 : 0,
      };
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("margem-mecanico error:", err);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
