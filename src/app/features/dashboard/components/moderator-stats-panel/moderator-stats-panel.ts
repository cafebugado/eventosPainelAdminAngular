import { Component, computed, inject, OnInit } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../../core/services/auth.service';
import { EventService } from '../../../../core/services/event.service';
import { RoleService } from '../../../../core/services/role.service';
import { parseEventDate } from '../../../../shared/utils/event-date.util';

const MOTIVATIONAL_PHRASES: Record<string, string> = {
  moderador: 'Sua dedicação fortalece a conexão com a comunidade.',
  admin: 'Sua liderança mantém a plataforma em movimento.',
  super_admin: 'Você tem o controle total do sistema em suas mãos.',
};

@Component({
  selector: 'app-moderator-stats-panel',
  imports: [MatCardModule, MatIconModule],
  templateUrl: './moderator-stats-panel.html',
  styleUrl: './moderator-stats-panel.scss',
})
export class ModeratorStatsPanel implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly eventService = inject(EventService);
  readonly roleService = inject(RoleService);

  readonly myContributions = computed(() => {
    const userId = this.auth.currentUser()?.id;
    return this.eventService.events().filter((event) => event.created_by === userId).length;
  });

  readonly thisWeekCount = computed(() => this.countInRange(0, 6));
  readonly upcomingCount = computed(() => this.countInRange(0, 30));

  readonly motivationalPhrase = computed(() => {
    const role = this.roleService.role();
    return role ? MOTIVATIONAL_PHRASES[role] : '';
  });

  ngOnInit(): void {
    this.eventService.getEvents().subscribe();
  }

  private countInRange(startDays: number, endDays: number): number {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const start = new Date(now);
    start.setDate(start.getDate() + startDays);
    const end = new Date(now);
    end.setDate(end.getDate() + endDays);

    return this.eventService.events().filter((event) => {
      const eventDate = parseEventDate(event.data_evento);
      return eventDate && eventDate >= start && eventDate <= end;
    }).length;
  }
}
