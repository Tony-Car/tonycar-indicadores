import { neon } from "@neondatabase/serverless";

const connectionString = process.env.DATABASE_URL!;

export function getDb() {
  return neon(connectionString);
}

export interface QueryFilters {
  anoAtual?: number
  tipoItem?: string[]
  mecanico?: string[]
  area?: string[]
  grupo?: string[]
  subgrupo?: string[]
  status?: string[]
}

export function buildFilterConditions(
  filters: QueryFilters,
  startIdx = 1
): { conditions: string[]; params: unknown[]; nextIdx: number } {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = startIdx;

  if (filters.status && filters.status.length > 0) {
    conditions.push(`o.status = ANY($${idx++})`);
    params.push(filters.status);
  } else {
    // Por padrão, não mostramos cancelados a menos que explicitamente filtrado
    conditions.push("o.flag_cancelado = false");
  }

  if (filters.tipoItem && filters.tipoItem.length > 0) {
    conditions.push(`io.tipo_item = ANY($${idx++})`);
    params.push(filters.tipoItem);
  }
  if (filters.mecanico && filters.mecanico.length > 0) {
    conditions.push(`o.mecanico_responsavel = ANY($${idx++})`);
    params.push(filters.mecanico);
  }
  if (filters.area && filters.area.length > 0) {
    conditions.push(`io.area = ANY($${idx++})`);
    params.push(filters.area);
  }
  if (filters.grupo && filters.grupo.length > 0) {
    conditions.push(`io.grupo = ANY($${idx++})`);
    params.push(filters.grupo);
  }
  if (filters.subgrupo && filters.subgrupo.length > 0) {
    conditions.push(`io.subgrupo = ANY($${idx++})`);
    params.push(filters.subgrupo);
  }

  return { conditions, params, nextIdx: idx };
}

export function parseArrayParam(value: string | null): string[] {
  if (!value) return [];
  return value.split(",").map((v) => v.trim()).filter(Boolean);
}
