import { Component, Input } from '@angular/core';
import { ControlContainer, FormGroupDirective, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { BRAZIL_STATES } from '../../utils/brazil-states.util';

@Component({
  selector: 'app-location-selector',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  templateUrl: './location-selector.html',
  viewProviders: [{ provide: ControlContainer, useExisting: FormGroupDirective }],
})
export class LocationSelector {
  @Input() enderecoControlName = 'endereco';
  @Input() cidadeControlName = 'cidade';
  @Input() estadoControlName = 'estado';

  readonly states = BRAZIL_STATES;
}
