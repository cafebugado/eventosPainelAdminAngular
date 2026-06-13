import { Pipe, PipeTransform } from '@angular/core';
import { ROLE_LABELS, Role } from '../../core/models/user.model';

@Pipe({ name: 'roleLabel' })
export class RoleLabelPipe implements PipeTransform {
  transform(role: Role | null | undefined): string {
    return ROLE_LABELS[role ?? 'none'];
  }
}
