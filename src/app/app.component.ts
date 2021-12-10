import { AfterViewInit, Component, ViewChild } from "@angular/core";
import { FormBuilder } from "@angular/forms";
import { MatDialog, MatDialogRef } from "@angular/material/dialog";
import { MatPaginator, PageEvent } from "@angular/material/paginator";
import { MatSlideToggleChange } from "@angular/material/slide-toggle";
import { DomSanitizer } from "@angular/platform-browser";
import { faTimes, faEdit, faTrash } from "@fortawesome/free-solid-svg-icons";
import escapeStringRegexp from "escape-string-regexp";
import { mapValues } from "lodash-es";
import { BehaviorSubject, combineLatest, Observable } from "rxjs";
import {
  debounceTime,
  map,
  shareReplay,
  startWith,
  switchMap,
} from "rxjs/operators";

import {
  LocalizationsService,
  LocalizationWithBaseType,
} from "../services/localizations.service";
import { NotificationService } from "../services/notification.service";

import { ConfirmDialogComponent } from "./confirm-dialog.component";
import { EditDialogComponent } from "./edit-dialog.component";

@Component({
  selector: "app-root",
  template: `
    <mat-toolbar *ngIf="(service.maintenance$ | async) !== true">
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
        [disabled]="(lang.valueChanges | async) === null"
        >Missing</mat-slide-toggle
      >
      <mat-slide-toggle
        (change)="onlyDupes$.next($event.checked)"
        [checked]="onlyDupes$ | async"
        [disabled]="(lang.valueChanges | async) === null"
        >Dupes</mat-slide-toggle
      >
      <mat-slide-toggle
        (change)="onlyEmpty$.next($event.checked)"
        [checked]="onlyEmpty$ | async"
        [disabled]="(lang.valueChanges | async) === null"
        >Empty</mat-slide-toggle
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
    <div *ngIf="(service.maintenance$ | async) !== true; else maintenance">
      <table
        *ngIf="(translations$ | async)?.length || (lang.valueChanges | async)"
        mat-table
        [dataSource]="pagedTranslations$"
      >
        <ng-container *ngFor="let column of columns">
          <ng-container [matColumnDef]="column.id">
            <th mat-header-cell *matHeaderCellDef>
              <ng-container [ngSwitch]="true">
                <ng-container *ngSwitchCase="column.id === 'edit'">
                </ng-container>
                <ng-container *ngSwitchCase="column.id === 'delete'">
                </ng-container>
                <ng-container *ngSwitchDefault>
                  <mat-form-field
                    class="example-form-field"
                    appearance="standard"
                  >
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
                </ng-container>
              </ng-container>
            </th>
            <td mat-cell *matCellDef="let element">
              <ng-container [ngSwitch]="true">
                <ng-container *ngSwitchCase="column.id === 'edit'">
                  <a class="icon" (click)="edit(element)"
                    ><fa-icon [icon]="faEdit"></fa-icon
                  ></a>
                </ng-container>
                <ng-container *ngSwitchCase="column.id === 'delete'">
                  <a
                    *ngIf="!element.missing"
                    class="icon"
                    (click)="remove(element)"
                    ><fa-icon [icon]="faTrash"></fa-icon
                  ></a>
                </ng-container>
                <ng-container *ngSwitchDefault>
                  <span
                    class="unselectable"
                    [ngClass]="{
                      'missing-translation': element.missing,
                      'dupe-translation': element.dupe,
                      'protected-translation': element.ignored
                    }"
                    ><ng-container
                      *ngIf="element[column.id] !== undefined; else undef"
                      >{{ element[column.id] }}</ng-container
                    ><ng-template #undef><i>undefined</i></ng-template>
                  </span>
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
    <ng-template #maintenance>
      <h1 class="center">MAINTENANCE! Please come by later.</h1>
      <h2 class="center">The data you entered is in good hands.</h2>
      <h3 class="center">DON'T PANIC!</h3>
    </ng-template>
  `,
  styles: [
    `
      .missing-translation {
        color: red;
      }
      .dupe-translation {
        color: green;
      }
      .protected-translation {
        color: grey;
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
      .mat-row:nth-child(odd) {
        background-color: #eee;
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
      .center {
        text-align: center;
      }
    `,
  ],
})
export class AppComponent implements AfterViewInit {
  lang = this.fb.control("");

  onlyMissing$ = new BehaviorSubject<boolean>(false);
  onlyDupes$ = new BehaviorSubject<boolean>(false);
  onlyEmpty$ = new BehaviorSubject<boolean>(false);

  @ViewChild(MatPaginator) paginator: MatPaginator;

  pagedTranslations$: Observable<LocalizationWithBaseType[]>;

  columns = [
    { id: "key", value: "Translation Key" },
    { id: "base", value: "Base Language" },
    { id: "edit", value: "" },
    { id: "tr", value: "Translation" },
    { id: "delete", value: "" },
  ];

  displayedColumns = this.columns.map((x) => x.id);
  filters = this.fb.group(
    this.columns.reduce(
      (acc, x) => ({ ...acc, [x.id]: this.fb.control(undefined) }),
      {}
    )
  );

  faEdit = faEdit;
  faTimes = faTimes;
  faTrash = faTrash;

  constructor(
    private fb: FormBuilder,
    private dialog: MatDialog,
    public service: LocalizationsService,
    private notification: NotificationService,
    private sanitizer: DomSanitizer
  ) {}

  translations$ = combineLatest([
    this.lang.valueChanges,
    this.onlyMissing$,
    this.onlyDupes$,
    this.onlyEmpty$,
    this.filters.valueChanges.pipe(
      startWith({}),
      map((record) =>
        mapValues(
          record,
          (v: unknown) =>
            v && new RegExp(`${escapeStringRegexp(v.toString())}`, "i")
        )
      ),
      debounceTime(500)
    ),
  ]).pipe(
    switchMap(([lang, onlyMissing, onlyDupes, onlyEmpty, filters]) =>
      this.service
        .localizationsWithBase$(lang)
        .pipe(
          map((array) =>
            array
              .filter(
                (e) =>
                  (onlyMissing && e.missing) ||
                  (onlyDupes && e.dupe) ||
                  (onlyEmpty && e.tr?.trim() === "") ||
                  (!onlyMissing && !onlyDupes && !onlyEmpty)
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
    if (element.ignored) {
      this.notification.warning(
        `The translation for "${element.key}" is protected and cannot be changed here.`
      );
      return;
    }

    const ref: MatDialogRef<EditDialogComponent, string> = this.dialog.open(
      EditDialogComponent,
      {
        data: {
          element,
          google: this.service.translate(this.lang.value, element.base),
        },
      }
    );

    ref.afterClosed().subscribe((newTranslation) => {
      if (newTranslation !== undefined) {
        this.service.set(this.lang.value, element.key, newTranslation);
      }
    });
  }

  remove(element: LocalizationWithBaseType) {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: `Really delete translation '${element.tr}' for key '${element.key}'`,
    });
    ref.afterClosed().subscribe((confirmation) => {
      if (confirmation) {
        this.service.delete(this.lang.value, element.key);
      }
    });
  }

  csvDownloadName$ = this.lang.valueChanges.pipe(
    map((lang) => {
      return `${lang}.csv`;
    })
  );

  csvDownloadFile$ = this.translations$.pipe(
    map((data) => data.map((e) => this.csvLine(e)).join("\n")),
    map((data) =>
      this.sanitizer.bypassSecurityTrustResourceUrl(
        window.URL.createObjectURL(
          new Blob([data], { type: "application/octet-stream" })
        )
      )
    )
  );

  private escapeCsvCell(s: string): string {
    return !s ? "" : '"' + s?.replace(/"/g, '""') + '"';
  }

  private csvLine(e: LocalizationWithBaseType): string {
    return [e.key, this.escapeCsvCell(e.base), this.escapeCsvCell(e.tr)].join(
      ";"
    );
  }

  blockAPI(event: MatSlideToggleChange) {
    this.service.blockAPI(event.checked);
  }
}
