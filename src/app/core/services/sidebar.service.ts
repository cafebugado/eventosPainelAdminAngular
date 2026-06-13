import { Injectable, effect, signal } from '@angular/core';

const SIDEBAR_STORAGE_KEY = 'eventos_admin_sidebar_collapsed';

@Injectable({ providedIn: 'root' })
export class SidebarService {
  readonly collapsed = signal(this.loadCollapsed());

  constructor() {
    effect(() => {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(this.collapsed()));
    });
  }

  toggle(): void {
    this.collapsed.set(!this.collapsed());
  }

  private loadCollapsed(): boolean {
    return localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true';
  }
}
