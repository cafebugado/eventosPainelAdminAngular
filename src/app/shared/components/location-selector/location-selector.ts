import { Component, DestroyRef, Input, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ControlContainer, FormControl, FormGroupDirective, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { catchError, distinctUntilChanged, finalize, of, startWith, switchMap } from 'rxjs';
import { BrazilCity, BrazilLocationService } from '../../services/brazil-location.service';
import { BRAZIL_STATES } from '../../utils/brazil-states.util';

@Component({
  selector: 'app-location-selector',
  imports: [ReactiveFormsModule, MatAutocompleteModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  templateUrl: './location-selector.html',
  styleUrl: './location-selector.scss',
  viewProviders: [{ provide: ControlContainer, useExisting: FormGroupDirective }],
})
export class LocationSelector implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly formGroupDirective = inject(FormGroupDirective);
  private readonly brazilLocationService = inject(BrazilLocationService);

  @Input() enderecoControlName = 'endereco';
  @Input() cidadeControlName = 'cidade';
  @Input() estadoControlName = 'estado';

  readonly states = BRAZIL_STATES;
  readonly cities = signal<BrazilCity[]>([]);
  readonly filteredCities = signal<BrazilCity[]>([]);
  readonly loadingCities = signal(false);
  readonly cityLoadError = signal(false);
  readonly hasSelectedState = signal(false);

  ngOnInit(): void {
    const stateControl = this.getFormControl(this.estadoControlName);
    const cityControl = this.getFormControl(this.cidadeControlName);

    let previousState: string | null = null;

    stateControl.valueChanges
      .pipe(
        startWith(stateControl.value),
        distinctUntilChanged(),
        switchMap((state) => {
          const normalizedState = this.normalizeUf(state);
          const shouldClearCity = previousState !== null && previousState !== normalizedState;
          previousState = normalizedState;

          this.hasSelectedState.set(!!normalizedState);
          this.cities.set([]);
          this.filteredCities.set([]);
          this.cityLoadError.set(false);

          if (shouldClearCity) {
            cityControl.setValue('', { emitEvent: true });
          }

          if (!normalizedState) {
            this.loadingCities.set(false);
            return of([]);
          }

          this.loadingCities.set(true);
          return this.brazilLocationService.getCitiesByState(normalizedState).pipe(
            catchError(() => {
              this.cityLoadError.set(true);
              return of([]);
            }),
            finalize(() => this.loadingCities.set(false)),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((cities) => {
        this.cities.set(cities);
        this.filterCities(cityControl.value);
      });

    cityControl.valueChanges
      .pipe(startWith(cityControl.value), takeUntilDestroyed(this.destroyRef))
      .subscribe((city) => this.filterCities(city));
  }

  private getFormControl(controlName: string): FormControl<string> {
    const control = this.formGroupDirective.form.get(controlName);
    if (!control) {
      throw new Error(`Controle "${controlName}" não encontrado no formulário.`);
    }
    return control as FormControl<string>;
  }

  private filterCities(value: string | null): void {
    const query = this.normalizeText(value ?? '');
    const cities = this.cities();

    if (!query) {
      this.filteredCities.set(cities);
      return;
    }

    this.filteredCities.set(cities.filter((city) => this.normalizeText(city.nome).includes(query)));
  }

  private normalizeUf(value: string | null): string {
    return (value ?? '').trim().toUpperCase();
  }

  private normalizeText(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('pt-BR')
      .trim();
  }
}
