import { Component } from "@angular/core";
import { FormBuilder, FormControl } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import {
  faArrowCircleLeft,
  faBan,
  faFilter,
} from "@fortawesome/free-solid-svg-icons";
import {
  combineLatest,
  delay,
  map,
  Observable,
  pluck,
  startWith,
  switchMap,
} from "rxjs";

import { ConfigService } from "../services/config.service";
import { filterOverrides, OverridesFilters } from "../services/filters";
import { LocalizationsService } from "../services/localizations.service";

@Component({
  selector: "app-translation-detail",
  template: `
    <mat-toolbar>
      <button
        mat-icon-button
        aria-label="Back to table"
        routerLink="/"
        queryParamsHandling="preserve"
      >
        <fa-icon [icon]="faArrowCircleLeft" size="lg"></fa-icon>
      </button>
      <mat-form-field appearance="standard">
        <mat-label>Language</mat-label>
        <mat-select [formControl]="lang">
          <mat-option *ngFor="let lang of languages$ | async" [value]="lang">{{
            lang || "all"
          }}</mat-option>
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="standard" class="key-input">
        <mat-label>Key</mat-label>
        <input
          matInput
          placeholder="key"
          [value]="key$ | async"
          [disabled]="true"
        />
      </mat-form-field>
      <button
        mat-icon-button
        [matMenuTriggerFor]="filterMenu"
        aria-label="Filters"
        class="filter-button"
        [ngClass]="{ 'filters-active': filtersActive$ | async }"
      >
        <fa-icon [icon]="faFilter" size="lg"></fa-icon>
      </button>
      <mat-menu #filterMenu="matMenu">
        <a
          mat-menu-item
          [disabled]="(filtersActive$ | async) !== true"
          (click)="clearAllFilters()"
        >
          <fa-icon [icon]="faBan"></fa-icon>
          <span>Clear Filters</span>
        </a>

        <mat-radio-group
          aria-label="Select an option"
          [formControl]="filters.controls.type"
        >
          <div mat-menu-item>
            <mat-radio-button [value]="undefined" [checked]="true"
              >all</mat-radio-button
            >
          </div>
          <div mat-menu-item>
            <mat-radio-button value="lang">Languages</mat-radio-button>
          </div>
          <div mat-menu-item>
            <mat-radio-button value="locale">Locales</mat-radio-button>
          </div>
          <ng-container *ngIf="(config.select('themes') | async)?.length">
            <div mat-menu-item>
              <mat-radio-button value="theme">Themes</mat-radio-button>
            </div>
            <div mat-menu-item>
              <mat-radio-button value="lang+theme"
                >Language x Themes</mat-radio-button
              >
            </div>
            <div mat-menu-item>
              <mat-radio-button value="locale+theme"
                >Locale x Themes</mat-radio-button
              >
            </div>
          </ng-container>
        </mat-radio-group>
      </mat-menu>
    </mat-toolbar>

    <div>
      <table mat-table [dataSource]="overrides$">
        <ng-container *ngFor="let column of columns">
          <ng-container [matColumnDef]="column.id">
            <th mat-header-cell *matHeaderCellDef>
              <span>{{ column.value }}</span>
            </th>
            <td mat-cell *matCellDef="let element">
              <span
                class="unselectable"
                [ngClass]="{ 'value-interpolated': !element.value }"
                ><ng-container
                  *ngIf="element[column.id] !== undefined; else undef"
                  >{{ element[column.id] }}</ng-container
                ><ng-template #undef><i>undefined</i></ng-template>
              </span>
            </td>
          </ng-container>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
        <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
      </table>
    </div>
  `,
  styles: [
    `
      .mat-toolbar {
        height: unset;
        justify-content: space-between;
      }
      .mat-toolbar > * {
        margin-right: 24px;
      }
      .filter-button {
        margin-left: auto;
      }
      .mat-menu-item > .ng-fa-icon {
        margin-right: 20px;
      }
      .filters-active .ng-fa-icon {
        color: blue;
      }

      .key-input {
        min-width: 50%;
      }
      .value-interpolated {
        color: lightgray;
      }

      td.icon-column {
        padding-left: 10px;
        padding-right: 10px;
        width: 10px;
      }
      td:not(.icon-column) {
        padding: 5px;
      }
    `,
  ],
})
export class TranslationDetailComponent {
  key$ = this.route.params.pipe(pluck("key"));

  lang = this.fb.control("");

  languages$ = this.config
    .select("languages")
    .pipe(map((langs) => [undefined, ...langs]));

  overrides$ = combineLatest([this.lang.valueChanges, this.key$]).pipe(
    switchMap(([lang, key]) =>
      combineLatest([
        this.service.overrides$(lang, key),
        this.filters.valueChanges.pipe(startWith(this.filters.value)),
      ]).pipe(
        map(([overrides, filters]) => filterOverrides(overrides, filters))
      )
    )
  );

  displayedColumns = ["id", "interpolated"];

  columns = [
    { id: "id", value: "ID" },
    { id: "interpolated", value: "" },
  ];

  filters = this.fb.group({
    type: this.fb.control(undefined),
  }) as unknown as {
    controls: Record<keyof OverridesFilters, FormControl>;
    value: OverridesFilters;
    valueChanges: Observable<OverridesFilters>;
    get: (id: string) => FormControl;
    setValue: (value: OverridesFilters) => void;
  };

  filtersActive$ = this.filters.valueChanges.pipe(
    map((filters) => Object.values(filters).some((v) => !!v))
  );

  faArrowCircleLeft = faArrowCircleLeft;
  faFilter = faFilter;
  faBan = faBan;

  constructor(
    private route: ActivatedRoute,
    private service: LocalizationsService,
    public config: ConfigService,
    private fb: FormBuilder,
    router: Router
  ) {
    route.queryParams.pipe(pluck("lang"), delay(100)).subscribe((lang) => {
      if (lang !== this.lang.value) {
        this.lang.setValue(lang);
      }
    });

    this.lang.valueChanges.subscribe((lang) => {
      router.navigate([], { queryParams: { lang }, relativeTo: route });
    });
  }

  clearAllFilters() {
    this.filters.setValue(
      Object.keys(this.filters.value).reduce(
        (acc, key) => ({ ...acc, [key]: null }),
        {} as OverridesFilters
      )
    );
  }
}
