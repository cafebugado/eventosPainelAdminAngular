import { BreakpointObserver } from '@angular/cdk/layout';
import { Component, computed, inject, input, output, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

@Component({
  selector: 'app-pagination',
  imports: [MatButtonModule, MatIconModule],
  templateUrl: './pagination.html',
  styleUrl: './pagination.scss',
})
export class Pagination {
  private readonly breakpointObserver = inject(BreakpointObserver);

  readonly totalItems = input.required<number>();
  readonly page = input<number>(1);
  readonly pageChange = output<number>();

  private readonly isMobile = toSignal(
    this.breakpointObserver.observe('(max-width: 768px)').pipe(map((result) => result.matches)),
    { initialValue: false },
  );

  readonly pageSize = computed(() => (this.isMobile() ? 10 : 20));
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.totalItems() / this.pageSize())));

  goToPage(page: number): void {
    const clamped = Math.min(Math.max(1, page), this.totalPages());
    if (clamped !== this.page()) {
      this.pageChange.emit(clamped);
    }
  }

  previous(): void {
    this.goToPage(this.page() - 1);
  }

  next(): void {
    this.goToPage(this.page() + 1);
  }
}
