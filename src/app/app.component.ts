import { AfterViewInit, Component, ViewChild } from "@angular/core";
import { FormBuilder } from "@angular/forms";
import { MatPaginator, PageEvent } from "@angular/material/paginator";
import { MatSlideToggleChange } from "@angular/material/slide-toggle";
import { DomSanitizer } from "@angular/platform-browser";
import { faTimes } from "@fortawesome/free-solid-svg-icons";
import escapeStringRegexp from "escape-string-regexp";
import { mapValues } from "lodash-es";
import { BehaviorSubject, combineLatest, Observable } from "rxjs";
import { map, shareReplay, startWith, switchMap } from "rxjs/operators";

import {
  LocalizationsService,
  LocalizationWithBaseType,
} from "../services/localizations.service";

@Component({
  selector: "app-root",
  template: `
    <mat-toolbar>
      <mat-form-field appearance="standard">
        <mat-label>Language</mat-label>
        <mat-select [formControl]="lang">
          <mat-option
            *ngFor="let lang of service.languages$ | async"
            [value]="lang"
            >{{ lang }}</mat-option
          >
        </mat-select>
      </mat-form-field>
      <mat-slide-toggle
        (change)="blockAPI($event)"
        [checked]="this.service.blockedAPI$ | async"
        >Block API</mat-slide-toggle
      >
      <mat-slide-toggle
        (change)="onlyMissing$.next($event.checked)"
        [checked]="onlyMissing$ | async"
        >Missing</mat-slide-toggle
      >
      <mat-slide-toggle
        (change)="onlyDupes$.next($event.checked)"
        [checked]="onlyDupes$ | async"
        >Dupes</mat-slide-toggle
      >
      <mat-paginator
        [pageSizeOptions]="[10, 15, 20, 50, 100, 1000]"
        showFirstLastButtons
        [length]="(translations$ | async)?.length"
      >
      </mat-paginator>
      <a
        mat-raised-button
        color="primary"
        [href]="csvDownloadFile$ | async"
        [download]="csvDownloadName$ | async"
        [disabled]="(csvDownloadFile$ | async) === null"
      >
        Download Table
      </a>
    </mat-toolbar>
    <div>
      <table mat-table [dataSource]="pagedTranslations$">
        <ng-container *ngFor="let column of columns">
          <ng-container [matColumnDef]="column.id">
            <th mat-header-cell *matHeaderCellDef>
              <mat-form-field class="example-form-field" appearance="standard">
                <mat-label>{{ column.value }}</mat-label>
                <input
                  matInput
                  type="text"
                  [formControl]="$any(filters.get(column.id))"
                />
                <button
                  *ngIf="filters.get(column.id).valueChanges | async"
                  matSuffix
                  mat-icon-button
                  aria-label="Clear"
                  (click)="filters.get(column.id).setValue('')"
                >
                  <fa-icon [icon]="faTimes"></fa-icon>
                </button>
              </mat-form-field>
            </th>
            <td mat-cell *matCellDef="let element">
              <ng-container [ngSwitch]="true">
                <ng-container *ngSwitchDefault>
                  <span
                    class="unselectable"
                    [ngClass]="{
                      'missing-translation': element.missing,
                      'dupe-translation': element.dupe
                    }"
                    >{{ convert(element[column.id]) }}</span
                  >
                </ng-container>
              </ng-container>
            </td>
          </ng-container>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
        <tr
          mat-row
          *matRowDef="let row; columns: displayedColumns"
          (dblclick)="edit(row)"
        ></tr>
      </table>
    </div>
  `,
  styles: [
    `
      .missing-translation {
        color: red;
      }
      .dupe-translation {
        color: green;
      }

      .mat-toolbar {
        height: unset;
        justify-content: space-between;
      }
      .mat-paginator {
        background: unset;
      }
      .mat-table {
        width: 100%;
      }
      .mat-cell {
        padding: 5px;
      }
      .mat-header-cell {
        text-align: center;
      }
      td.mat-cell:first-of-type,
      th.mat-header-cell:first-of-type {
        padding-left: 5px;
      }
      td.mat-cell:last-of-type,
      th.mat-header-cell:last-of-type {
        padding-right: 5px;
      }
      .unselectable {
        -webkit-touch-callout: none;
        -webkit-user-select: none;
        -khtml-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
      }
    `,
  ],
})
export class AppComponent implements AfterViewInit {
  lang = this.fb.control("");

  onlyMissing$ = new BehaviorSubject<boolean>(false);
  onlyDupes$ = new BehaviorSubject<boolean>(false);

  @ViewChild(MatPaginator) paginator: MatPaginator;

  pagedTranslations$: Observable<LocalizationWithBaseType[]>;

  columns = [
    { id: "key", value: "Translation Key" },
    { id: "base", value: "Base Language" },
    { id: "tr", value: "Translation" },
  ];

  displayedColumns = this.columns.map((x) => x.id);
  filters = this.fb.group(
    this.columns.reduce(
      (acc, x) => ({ ...acc, [x.id]: this.fb.control(undefined) }),
      {}
    )
  );

  faTimes = faTimes;

  constructor(
    private fb: FormBuilder,
    public service: LocalizationsService,
    private sanitizer: DomSanitizer
  ) {}

  translations$ = combineLatest([
    this.lang.valueChanges,
    this.onlyMissing$,
    this.onlyDupes$,
    this.filters.valueChanges.pipe(
      startWith({}),
      map((record) =>
        mapValues(
          record,
          (v: unknown) =>
            v && new RegExp(`${escapeStringRegexp(v.toString())}`, "i")
        )
      )
    ),
  ]).pipe(
    switchMap(([lang, onlyMissing, onlyDupes, filters]) =>
      this.service
        .localizationsWithBase$(lang)
        .pipe(
          map((array) =>
            array
              .filter(
                (e) =>
                  (onlyMissing && e.missing) ||
                  (onlyDupes && e.dupe) ||
                  (!onlyMissing && !onlyDupes)
              )
              .filter((e) =>
                (
                  Object.keys(filters) as (keyof LocalizationWithBaseType)[]
                ).every(
                  (key) =>
                    !filters[key] ||
                    (typeof e[key] === "string" &&
                      filters[key].test(e[key] as string))
                )
              )
          )
        )
    ),
    shareReplay(1)
  );

  ngAfterViewInit() {
    this.pagedTranslations$ = combineLatest([
      this.translations$,
      this.paginator.page.pipe(
        startWith({
          pageSize: this.paginator.pageSize,
          pageIndex: 0,
        } as PageEvent)
      ),
    ]).pipe(
      map(([entries, pageEvent]) => {
        if (pageEvent.pageIndex !== undefined) {
          const start = pageEvent.pageIndex * pageEvent.pageSize;
          return entries.slice(start, start + pageEvent.pageSize);
        }

        return entries;
      })
    );
  }

  trackByFn(idx: number) {
    return idx;
  }

  edit(element: LocalizationWithBaseType) {
    console.log("edit", element);
  }

  convert(obj: unknown) {
    return typeof obj === "string" ? obj : JSON.stringify(obj);
  }

  csvDownloadName$ = this.lang.valueChanges.pipe(
    map((lang) => {
      return `${lang}.csv`;
    })
  );

  csvDownloadFile$ = this.translations$.pipe(
    map((data) =>
      data.map((e) => `${e.key};${e.base};${e.tr || ""}`).join("\n")
    ),
    map((data) =>
      this.sanitizer.bypassSecurityTrustResourceUrl(
        window.URL.createObjectURL(
          new Blob([data], { type: "application/octet-stream" })
        )
      )
    )
  );

  blockAPI(event: MatSlideToggleChange) {
    this.service.blockAPI(event.checked);
  }
}
