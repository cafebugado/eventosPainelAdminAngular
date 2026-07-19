import { AuditLogRead, AuditUser } from './audit.model';
import { EventoRead } from './evento.model';

export interface DashboardEventCounts {
  total: number;
  hoje: number;
  semana: number;
  mes: number;
  ano: number;
  diurno: number;
  noturno: number;
  meus_eventos: number;
}

export interface DashboardSummary {
  eventos: DashboardEventCounts;
  comunidades: number | null;
  contribuintes: number | null;
  fotos: number | null;
  usuarios: number | null;
  proximos_eventos: EventoRead[];
  pendentes_revisao: EventoRead[];
  atividade_recente: AuditLogRead[];
  atividade_usuarios: AuditUser[];
}
