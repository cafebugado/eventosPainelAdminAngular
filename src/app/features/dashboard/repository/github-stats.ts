import { Component, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { ContributorInfo, GithubCommit, GithubPR, RepoStats } from '../../../core/models/github.model';
import { GithubService } from '../../../core/services/github.service';

interface RepoPanelState {
  repo: string;
  label: string;
  stats: RepoStats | null;
  commits: GithubCommit[];
  prs: GithubPR[];
  contributors: ContributorInfo[];
  loading: boolean;
}

const REPOS: { repo: string; label: string }[] = [
  { repo: 'cafe-bugado/eventos-frontend', label: 'Frontend' },
  { repo: 'cafe-bugado/eventos-backend', label: 'Backend' },
];

@Component({
  selector: 'app-github-stats',
  imports: [DatePipe, MatButtonModule, MatCardModule, MatChipsModule, MatIconModule, MatProgressSpinnerModule, MatTabsModule],
  templateUrl: './github-stats.html',
  styleUrl: './github-stats.scss',
})
export class GithubStats implements OnInit {
  private readonly githubService = inject(GithubService);

  readonly panels = signal<RepoPanelState[]>(
    REPOS.map((r) => ({ ...r, stats: null, commits: [], prs: [], contributors: [], loading: false })),
  );

  ngOnInit(): void {
    this.refreshAll();
  }

  refreshAll(): void {
    this.panels().forEach((_, index) => this.refreshPanel(index));
  }

  refreshPanel(index: number): void {
    const panel = this.panels()[index];
    this.updatePanel(index, { loading: true });

    this.githubService.getRepoStats(panel.repo).subscribe((stats) => this.updatePanel(index, { stats }));
    this.githubService.getRecentCommits(panel.repo).subscribe((commits) => this.updatePanel(index, { commits }));
    this.githubService.getRecentPRs(panel.repo).subscribe((prs) => this.updatePanel(index, { prs }));
    this.githubService
      .getTopContributors(panel.repo)
      .subscribe((contributors) => this.updatePanel(index, { contributors, loading: false }));
  }

  private updatePanel(index: number, partial: Partial<RepoPanelState>): void {
    this.panels.update((panels) => panels.map((p, i) => (i === index ? { ...p, ...partial } : p)));
  }

  prStateLabel(state: GithubPR['state']): string {
    return { merged: 'Mesclado', open: 'Aberto', closed: 'Fechado' }[state];
  }
}
