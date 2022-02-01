import { Component } from "@angular/core";
import { FormBuilder } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { combineLatest, delay, map, pluck, startWith, switchMap } from "rxjs";

import { ConfigService } from "../services/config.service";
import { LocalizationsService } from "../services/localizations.service";

@Component({
  selector: "app-translation-detail",
  template: `
    <mat-toolbar>
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
    </mat-toolbar>

    <div>
      <table
        *ngIf="(overrides$ | async)?.length"
        mat-table
        [dataSource]="overrides$"
      >
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
        justify-content: flex-start;
      }
      .mat-toolbar > * {
        margin-right: 24px;
      }
      .key-input {
        min-width: 50%;
      }
      .value-interpolated {
        color: lightgray;
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

  overrides$ = combineLatest([
    this.lang.valueChanges.pipe(startWith(this.lang.value)),
    this.key$,
  ]).pipe(switchMap(([lang, key]) => this.service.overrides$(lang, key)));

  displayedColumns = ["id", "interpolated"];

  columns = [
    { id: "id", value: "ID" },
    { id: "interpolated", value: "" },
  ];

  constructor(
    private route: ActivatedRoute,
    private service: LocalizationsService,
    public config: ConfigService,
    private fb: FormBuilder,
    router: Router
  ) {
    this.lang.valueChanges
      .pipe(startWith(this.lang.value))
      .subscribe((lang) => {
        router.navigate([], { queryParams: { lang }, relativeTo: route });
      });

    route.queryParams.pipe(pluck("lang"), delay(0)).subscribe((lang) => {
      if (lang && lang !== this.lang.value) {
        this.lang.setValue(lang);
      }
    });
  }
}
