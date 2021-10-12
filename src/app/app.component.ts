import { Component } from "@angular/core";
import { FormBuilder } from "@angular/forms";
import { MatSlideToggleChange } from "@angular/material/slide-toggle";
import { DomSanitizer } from "@angular/platform-browser";
import { BehaviorSubject, combineLatest } from "rxjs";
import { map, shareReplay, switchMap } from "rxjs/operators";

import { LocalizationsService } from "../services/localizations.service";

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
      <table>
        <tr>
          <th>Translation Key</th>
          <th>en</th>
          <th>{{ lang.value }}</th>
        </tr>
        <tr
          *ngFor="let item of translations$ | async; trackBy: trackByFn"
          [ngClass]="{
            'missing-translation': item.missing,
            'dupe-translation': item.dupe
          }"
        >
          <td>{{ item.key }}</td>
          <td>{{ item.base }}</td>
          <td>{{ item.tr }}</td>
        </tr>
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
    `,
  ],
})
export class AppComponent {
  lang = this.fb.control("");

  onlyMissing$ = new BehaviorSubject<boolean>(false);
  onlyDupes$ = new BehaviorSubject<boolean>(false);

  constructor(
    private fb: FormBuilder,
    public service: LocalizationsService,
    private sanitizer: DomSanitizer
  ) {}

  translations$ = combineLatest([
    this.lang.valueChanges,
    this.onlyMissing$,
    this.onlyDupes$,
  ]).pipe(
    switchMap(([lang, onlyMissing, onlyDupes]) =>
      this.service
        .localizationsWithBase$(lang)
        .pipe(
          map((array) =>
            array.filter(
              (e) =>
                (onlyMissing && e.missing) ||
                (onlyDupes && e.dupe) ||
                (!onlyMissing && !onlyDupes)
            )
          )
        )
    ),
    shareReplay(1)
  );

  trackByFn(idx: number) {
    return idx;
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
