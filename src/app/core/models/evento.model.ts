export type EventoPeriodo = 'Matinal' | 'Diurno' | 'Vespertino' | 'Noturno';
export type EventoStatus = 'rascunho' | 'publicado' | 'arquivado';
export type EventoModalidade = 'Online' | 'Presencial';

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
  search?: string;
}

export interface EventoWithTags extends EventoRead {
  tags?: import('./tag.model').TagRead[];
}

export interface EventoStats {
  total: number;
  diurno: number;
  noturno: number;
}
