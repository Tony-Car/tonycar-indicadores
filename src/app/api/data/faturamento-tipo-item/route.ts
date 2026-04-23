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
    mecanico: parseArrayParam(sp.get("mecanico")),
    area: parseArrayParam(sp.get("area")),
    grupo: parseArrayParam(sp.get("grupo")),
    subgrupo: parseArrayParam(sp.get("subgrupo")),
  };

  try {
    const db = getDb();
    const { conditions, params } = buildFilterConditions(filters, 3);

    const query = `
      SELECT
        io.tipo_item,
        SUM(io.valor_total_item) AS faturamento
      FROM marts.itens_orcamento io
      INNER JOIN marts.orcamentos o ON io.nk_orcamento = o.nk_orcamento
      WHERE ${conditions.join(" AND ")}
        AND io.data_orcamento >= $1 AND io.data_orcamento <= $2
        AND io.tipo_item IS NOT NULL
      GROUP BY 1
      ORDER BY faturamento DESC
    `;

    const rows = await db.query(query, [startDate, endDate, ...params]) as unknown as Array<{
      tipo_item: string; faturamento: string;
    }>;

    return NextResponse.json(
      rows.map((r) => ({
        tipo_item: r.tipo_item,
        faturamento_atual: parseFloat(r.faturamento),
        faturamento_anterior: 0,
      }))
    );
  } catch (err) {
    console.error("faturamento-tipo-item error:", err);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
