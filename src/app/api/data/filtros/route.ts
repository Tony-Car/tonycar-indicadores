import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  try {
    const db = getDb();

    const rawResults = await Promise.all([
      db.query(
        `SELECT DISTINCT mecanico_responsavel as value
         FROM marts.orcamentos
         WHERE mecanico_responsavel IS NOT NULL AND mecanico_responsavel != ''
         ORDER BY 1`
      ),
      db.query(
        `SELECT DISTINCT area as value
         FROM marts.itens_orcamento
         WHERE area IS NOT NULL AND area != ''
         ORDER BY 1`
      ),
      db.query(
        `SELECT DISTINCT grupo as value
         FROM marts.itens_orcamento
         WHERE grupo IS NOT NULL AND grupo != ''
         ORDER BY 1`
      ),
      db.query(
        `SELECT DISTINCT subgrupo as value
         FROM marts.itens_orcamento
         WHERE subgrupo IS NOT NULL AND subgrupo != ''
         ORDER BY 1`
      ),
    ]);

    const mecanicos = rawResults[0] as unknown as Array<{ value: string }>;
    const areas = rawResults[1] as unknown as Array<{ value: string }>;
    const grupos = rawResults[2] as unknown as Array<{ value: string }>;
    const subgrupos = rawResults[3] as unknown as Array<{ value: string }>;

    return NextResponse.json({
      mecanicos: mecanicos.map((r) => r.value),
      areas: areas.map((r) => r.value),
      grupos: grupos.map((r) => r.value),
      subgrupos: subgrupos.map((r) => r.value),
      tipo_item: ["Peças", "Serviços", "Terceiros", "Peças Fornecidas"],
    });
  } catch (err) {
    console.error("filtros error:", err);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
