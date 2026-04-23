import { NextRequest, NextResponse } from "next/server";
import { getDb, buildFilterConditions, parseArrayParam } from "@/lib/db";

const MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const anoAtual = parseInt(sp.get("anoAtual") || String(new Date().getFullYear()));
  const anoAnterior = anoAtual - 1;

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
      WITH base AS (
        SELECT
          EXTRACT(YEAR FROM io.data_orcamento)::int AS ano,
          EXTRACT(MONTH FROM io.data_orcamento)::int AS mes,
          SUM(io.valor_total_item) AS faturamento
        FROM marts.itens_orcamento io
        INNER JOIN marts.orcamentos o ON io.nk_orcamento = o.nk_orcamento
        WHERE ${conditions.join(" AND ")}
          AND EXTRACT(YEAR FROM io.data_orcamento) IN ($1, $2)
        GROUP BY 1, 2
      )
      SELECT
        mes,
        COALESCE(SUM(CASE WHEN ano = $1 THEN faturamento END), 0) AS faturamento_atual,
        COALESCE(SUM(CASE WHEN ano = $2 THEN faturamento END), 0) AS faturamento_anterior
      FROM base
      GROUP BY mes
      ORDER BY mes
    `;

    const rows = await db(query, [anoAtual, anoAnterior, ...params]) as Array<{
      mes: number; faturamento_atual: string; faturamento_anterior: string;
    }>;

    // Build accumulated values (fill missing months)
    let acumulado_atual = 0;
    let acumulado_anterior = 0;
    const byMes = new Map(rows.map((r) => [r.mes, r]));

    const result = Array.from({ length: 12 }, (_, i) => {
      const mes = i + 1;
      const row = byMes.get(mes);
      const fat_atual = row ? parseFloat(row.faturamento_atual) : 0;
      const fat_anterior = row ? parseFloat(row.faturamento_anterior) : 0;
      acumulado_atual += fat_atual;
      acumulado_anterior += fat_anterior;
      return {
        mes,
        label: MESES[i],
        faturamento_atual: fat_atual,
        faturamento_anterior: fat_anterior,
        acumulado_atual,
        acumulado_anterior,
      };
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("faturamento-acumulado error:", err);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
