export interface FilterParams {
  anoAtual: number
  tipoItem: string[]
  mecanico: string[]
  area: string[]
  grupo: string[]
  subgrupo: string[]
  mes?: number
}

export interface YoYDataPoint {
  label: string
  faturamento_atual: number
  faturamento_anterior: number
}

export interface MargemYoYDataPoint {
  label: string
  faturamento_atual: number
  lucro_atual: number
  margem_pct_atual: number
  faturamento_anterior: number
  lucro_anterior: number
  margem_pct_anterior: number
}

export interface TipoItemDataPoint {
  tipo_item: string
  faturamento_atual: number
  faturamento_anterior: number
}

export interface MargemTipoItemDataPoint {
  tipo_item: string
  faturamento: number
  lucro: number
  margem_pct: number
}

export interface DetalhamentoRow {
  area: string
  grupo: string
  subgrupo: string
  descricao_item: string
  faturamento: number
  custo: number | null
  lucro: number | null
  margem_pct: number | null
  tem_custo: boolean
}

export interface FiltrosDisponiveis {
  mecanicos: string[]
  areas: string[]
  grupos: string[]
  subgrupos: string[]
  tipo_item: string[]
}
