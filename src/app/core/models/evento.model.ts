export type EventoPeriodo = 'Matinal' | 'Diurno' | 'Vespertino' | 'Noturno';
export type EventoStatus = 'rascunho' | 'publicado' | 'arquivado' | 'em_analise' | 'recusado';
export type EventoModalidade = 'Online' | 'Presencial';
export type EventoDateFilter = 'upcoming' | 'past';

export interface EventoBase {
  nome: string;
  descricao?: string | null;
  data_evento: string;
  horario: string;
  dia_semana: string;
  periodo?: EventoPeriodo | null;
  link: string;
  imagem?: string | null;
  modalidade?: EventoModalidade | string | null;
  endereco?: string | null;
  cidade?: string | null;
  estado?: string | null;
  status: EventoStatus;
  motivo_recusa?: string | null;
}

export interface EventoCreate extends EventoBase {
  slug?: string;
}

export interface EventoUpdate extends Partial<EventoBase> {
  slug?: string;
}

export interface EventoRead extends EventoBase {
  id: string;
  slug?: string;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventoPage {
  items: EventoRead[];
  total: number;
  page: number;
  page_size: number;
}

export interface EventoPageFilters {
  page: number;
  pageSize: number;
  status?: EventoStatus;
  dateFilter?: EventoDateFilter;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  mine?: boolean;
}

export interface EventoWithTags extends EventoRead {
  tags?: import('./tag.model').TagRead[];
}

export interface EventoStats {
  total: number;
  diurno: number;
  noturno: number;
}

export interface DiaSemanaCount {
  dia_semana: string;
  total: number;
  percentual: number;
}

export interface PeriodoCount {
  periodo: string;
  total: number;
}

export interface ModalidadeCount {
  modalidade: string;
  total: number;
}

export interface CidadeCount {
  cidade: string;
  estado: string | null;
  total: number;
}

export interface StatusCount {
  status: EventoStatus;
  total: number;
}

export interface TagCount {
  tag_id: string;
  nome: string;
  cor: string;
  total: number;
}

export interface MonthlyCount {
  ano_mes: string;
  total: number;
}

export interface EventoMetrics {
  total_eventos: number;
  media_eventos_por_semana: number;
  por_dia_semana: DiaSemanaCount[];
  por_periodo: PeriodoCount[];
  por_modalidade: ModalidadeCount[];
  por_cidade: CidadeCount[];
  por_status: StatusCount[];
  top_tags: TagCount[];
  evolucao_mensal: MonthlyCount[];
}
