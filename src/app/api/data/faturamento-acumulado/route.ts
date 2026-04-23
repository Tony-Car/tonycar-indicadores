import { NextRequest, NextResponse } from "next/server";
import { getDb, buildFilterConditions, parseArrayParam } from "@/lib/db";

const MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

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
        EXTRACT(YEAR FROM io.data_orcamento)::int AS ano,
        EXTRACT(MONTH FROM io.data_orcamento)::int AS mes,
        SUM(io.valor_total_item) AS faturamento
      FROM marts.itens_orcamento io
      INNER JOIN marts.orcamentos o ON io.nk_orcamento = o.nk_orcamento
      WHERE ${conditions.join(" AND ")}
        AND io.data_orcamento >= $1 AND io.data_orcamento <= $2
      GROUP BY 1, 2
      ORDER BY 1, 2
    `;

    const rows = await db.query(query, [startDate, endDate, ...params]) as Array<{
      ano: number; mes: number; faturamento: string;
    }>;

    let acumulado_atual = 0;
    const result = rows.map((r) => {
      const fat = parseFloat(r.faturamento);
      acumulado_atual += fat;
      return {
        mes: r.mes,
        label: rows.length > 12 ? `${MESES[r.mes - 1]}/${String(r.ano).slice(2)}` : MESES[r.mes - 1],
        faturamento_atual: fat,
        faturamento_anterior: 0,
        acumulado_atual,
        acumulado_anterior: 0,
      };
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("faturamento-acumulado error:", err);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
