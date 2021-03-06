import { registerLocaleData } from "@angular/common";
import { AfterViewInit, Component, OnDestroy, ViewChild } from "@angular/core";
import { FormBuilder, FormControl } from "@angular/forms";
import { MatDialog, MatDialogRef } from "@angular/material/dialog";
import { MatPaginator, PageEvent } from "@angular/material/paginator";
import { MatSlideToggleChange } from "@angular/material/slide-toggle";
import { DomSanitizer } from "@angular/platform-browser";
import { ActivatedRoute, Router } from "@angular/router";
import {
  faTimes,
  faEdit,
  faTrash,
  faBars,
  faFileDownload,
  faFileUpload,
  faFilter,
  faBan,
  faSitemap,
} from "@fortawesome/free-solid-svg-icons";
import escapeStringRegexp from "escape-string-regexp";
import { mapValues } from "lodash-es";
import { combineLatest, Observable, Subject } from "rxjs";
import {
  debounceTime,
  delay,
  map,
  pluck,
  shareReplay,
  startWith,
  switchMap,
  takeUntil,
} from "rxjs/operators";

import { ConfigService } from "../services/config.service";
import { TranslationFilters, filterTranslations } from "../services/filters";
import {
  LocalizationsService,
  LocalizationWithBaseType,
} from "../services/localizations.service";
import { NotificationService } from "../services/notification.service";

import { ConfirmDialogComponent } from "./confirm-dialog.component";
import { EditDialogComponent } from "./edit-dialog.component";
import { UploadDialogComponent } from "./upload-dialog.component";

@Component({
  selector: "app-translation-table",
  template: `
    <mat-toolbar>
      <mat-form-field appearance="standard">
        <mat-label>Language</mat-label>
        <mat-select [formControl]="lang">
          <mat-option
            *ngFor="let lang of config.select('languages') | async"
            [value]="lang"
            >{{ lang }}</mat-option
          >
        </mat-select>
      </mat-form-field>
      <mat-slide-toggle
        (change)="blockAPI($event)"
        [checked]="config.select('block') | async"
        >Block API</mat-slide-toggle
      >

      <mat-paginator
        [pageSizeOptions]="[10, 15, 20, 50, 100, 1000]"
        showFirstLastButtons
        [length]="(translations$ | async)?.length"
      >
      </mat-paginator>

      <div class="menus">
        <button
          mat-icon-button
          [matMenuTriggerFor]="filterMenu"
          aria-label="Filters"
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
          <div mat-menu-item>
            <mat-slide-toggle [formControl]="filters.controls.onlyMissing"
              >Missing</mat-slide-toggle
            >
          </div>
          <div mat-menu-item>
            <mat-slide-toggle [formControl]="filters.controls.onlyDupes"
              >Dupes</mat-slide-toggle
            >
          </div>
          <div mat-menu-item>
            <mat-slide-toggle [formControl]="filters.controls.onlyEmpty"
              >Empty</mat-slide-toggle
            >
          </div>
          <div mat-menu-item>
            <mat-slide-toggle [formControl]="filters.controls.onlyComplex"
              >Complex</mat-slide-toggle
            >
          </div>
          <div mat-menu-item>
            <mat-slide-toggle [formControl]="filters.controls.onlyOverridden"
              >Overrides</mat-slide-toggle
            >
          </div>
        </mat-menu>

        <button
          mat-icon-button
          [matMenuTriggerFor]="actionMenu"
          aria-label="More Actions"
        >
          <fa-icon [icon]="faBars" size="lg"></fa-icon>
        </button>
        <mat-menu #actionMenu="matMenu">
          <a
            mat-menu-item
            [href]="csvDownloadFile$ | async"
            [download]="csvDownloadName$ | async"
            [disabled]="(csvDownloadFile$ | async) === null"
          >
            <fa-icon [icon]="faFileDownload"></fa-icon>
            <span>Download Table</span>
          </a>
          <a
            mat-menu-item
            [disabled]="!lang.value"
            (click)="uploadTranslations()"
          >
            <fa-icon [icon]="faFileUpload"></fa-icon>
            <span>Upload</span>
          </a>
        </mat-menu>
      </div>
    </mat-toolbar>
    <div>
      <ng-container *ngIf="displayedColumns$ | async as displayedColumns">
        <table
          *ngIf="lang.value"
          mat-table
          [trackBy]="trackByFn"
          [dataSource]="pagedTranslations$"
        >
          <ng-container *ngFor="let column of columns">
            <ng-container [matColumnDef]="column.id">
              <th
                mat-header-cell
                *matHeaderCellDef
                [ngClass]="{ 'icon-column': isIconColumn(column.id) }"
              >
                <ng-container [ngSwitch]="true">
                  <ng-container *ngSwitchCase="isIconColumn(column.id)">
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
                        [formControl]="filters.get(column.id)"
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
              <td
                mat-cell
                *matCellDef="let element"
                [ngClass]="{ 'icon-column': isIconColumn(column.id) }"
              >
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
                  <ng-container *ngSwitchCase="column.id === 'override'">
                    <a
                      class="icon"
                      [routerLink]="['/key', element.key]"
                      queryParamsHandling="preserve"
                      ><fa-icon
                        [icon]="faSitemap"
                        [ngClass]="{ 'grey-icon': !element.overridden }"
                      ></fa-icon
                    ></a>
                  </ng-container>
                  <ng-container *ngSwitchDefault>
                    <span
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
      </ng-container>
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
      .mat-menu-item > .ng-fa-icon {
        margin-right: 20px;
      }
      .filters-active .ng-fa-icon {
        color: blue;
      }

      .center {
        text-align: center;
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
export class TranslationTableComponent implements AfterViewInit, OnDestroy {
  lang = this.fb.control("");

  @ViewChild(MatPaginator) paginator: MatPaginator;

  pagedTranslations$: Observable<LocalizationWithBaseType[]>;

  columns = [
    { id: "override", value: "" },
    { id: "key", value: "Translation Key" },
    { id: "base", value: "Base Language" },
    { id: "edit", value: "" },
    { id: "tr", value: "Translation" },
    { id: "delete", value: "" },
  ];

  filters = this.fb.group({
    key: this.fb.control(undefined),
    base: this.fb.control(undefined),
    tr: this.fb.control(undefined),
    onlyMissing: this.fb.control(undefined),
    onlyDupes: this.fb.control(undefined),
    onlyEmpty: this.fb.control(undefined),
    onlyComplex: this.fb.control(undefined),
    onlyOverridden: this.fb.control(undefined),
  }) as unknown as {
    controls: Record<keyof TranslationFilters, FormControl>;
    value: TranslationFilters;
    valueChanges: Observable<TranslationFilters>;
    get: (id: string) => FormControl;
    setValue: (value: TranslationFilters) => void;
  };

  filtersActive$: Observable<boolean>;

  displayedColumns$ = combineLatest([
    this.config.select("baseLang"),
    this.lang.valueChanges,
  ]).pipe(
    map(([base, selected]) =>
      base === selected
        ? this.columns.filter((c) =>
            ["override", "key", "base"].some((id) => c.id === id)
          )
        : this.columns
    ),
    map((cols) => cols.map((x) => x.id))
  );

  faEdit = faEdit;
  faTimes = faTimes;
  faTrash = faTrash;
  faBars = faBars;
  faFileDownload = faFileDownload;
  faFileUpload = faFileUpload;
  faFilter = faFilter;
  faBan = faBan;
  faSitemap = faSitemap;

  private destroy$ = new Subject();

  constructor(
    private fb: FormBuilder,
    private dialog: MatDialog,
    public service: LocalizationsService,
    public config: ConfigService,
    private notification: NotificationService,
    private sanitizer: DomSanitizer,
    route: ActivatedRoute,
    router: Router
  ) {
    this.lang.valueChanges
      .pipe(startWith(this.lang.value), takeUntil(this.destroy$))
      .subscribe(async (lang) => {
        if (lang) {
          const localeData = await import(
            /* webpackInclude: /(locales\/[a-z]{2,3}).m?js$/ */
            /* webpackChunkName: "locale-data-[request]" */
            `node_modules/@angular/common/locales/${lang}`
          ).then((m) => m.default);
          registerLocaleData(localeData);

          router.navigate([], { queryParams: { lang }, relativeTo: route });
        }

        Object.entries(this.filters.controls)
          .filter(([c]) => c.startsWith("only"))
          .forEach(([, control]) => {
            if (lang) {
              control.enable();
            } else {
              control.disable();
            }
          });
      });

    route.queryParams
      .pipe(pluck("lang"), delay(0), takeUntil(this.destroy$))
      .subscribe((lang) => {
        if (lang && lang !== this.lang.value) {
          this.lang.setValue(lang);
        }
      });

    this.filtersActive$ = this.filters.valueChanges.pipe(
      map((filters) => Object.values(filters).some((v) => !!v))
    );
  }

  translations$ = combineLatest([
    this.lang.valueChanges,
    this.filters.valueChanges.pipe(
      startWith(this.filters.value),
      map((record) =>
        mapValues(record, (v: unknown) =>
          typeof v === "string"
            ? new RegExp(`${escapeStringRegexp(v.toString())}`, "i")
            : v
        )
      ),
      debounceTime(500)
    ),
  ]).pipe(
    switchMap(([lang, filters]) =>
      this.service
        .localizationsWithBase$(lang)
        .pipe(
          map((array) =>
            filterTranslations(array, filters as TranslationFilters)
          )
        )
    ),
    shareReplay(1)
  );

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

  isIconColumn(id: string) {
    return this.columns.find((c) => c.id === id)?.value === "";
  }

  edit(element: LocalizationWithBaseType) {
    if (element.ignored) {
      this.notification.warning(
        `The translation for "${element.key}" is protected and cannot be changed here.`
      );
      return;
    }
    if (this.config.get("baseLang") === this.lang.value) {
      this.notification.warning(`Editing base translations is not supported.`);
      return;
    }

    const ref = this.dialog.open<
      EditDialogComponent,
      EditDialogComponent["data"],
      string
    >(EditDialogComponent, {
      data: {
        element,
        baseLang: this.config.get("baseLang"),
        targetLang: this.lang.value,
        google:
          this.config.get("translateAvailable") &&
          this.service.googleTranslate(this.lang.value, element.base),
      },
    });

    ref
      .afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe((newTranslation) => {
        if (newTranslation !== undefined) {
          this.service.set(this.lang.value, element.key, newTranslation);
        }
      });
  }

  remove(element: LocalizationWithBaseType) {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: `Really delete translation '${element.tr}' for key '${element.key}'`,
    });
    ref
      .afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe((confirmation) => {
        if (confirmation) {
          this.service.delete(this.lang.value, element.key);
        }
      });
  }

  uploadTranslations() {
    const ref: MatDialogRef<
      UploadDialogComponent,
      { data: string; uploadType: string }
    > = this.dialog.open(UploadDialogComponent, { maxWidth: "40vw" });

    ref
      .afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        this.service.upload(this.lang.value, data.uploadType, data.data);
      });
  }

  private escapeCsvCell(s: string): string {
    return !s ? "" : '"' + s?.replace(/"/g, '""') + '"';
  }

  private csvLine(e: LocalizationWithBaseType): string {
    return [e.key, this.escapeCsvCell(e.base), this.escapeCsvCell(e.tr)].join(
      ","
    );
  }

  blockAPI(event: MatSlideToggleChange) {
    this.config.blockAPI(event.checked);
  }

  clearAllFilters() {
    this.filters.setValue(
      Object.keys(this.filters.value).reduce(
        (acc, key) => ({ ...acc, [key]: null }),
        {}
      )
    );
  }

  ngOnDestroy(): void {
    this.destroy$.next(undefined);
    this.destroy$.complete();
  }
}
