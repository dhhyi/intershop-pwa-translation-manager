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
    <div>
      <h1>Block API</h1>
      <mat-slide-toggle
        (change)="blockAPI($event)"
        [checked]="this.service.blockedAPI$ | async"
        >Block API</mat-slide-toggle
      >
      <h1>Issues</h1>
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
      <h1>Set Translation</h1>
      <form matForm [formGroup]="form" (ngSubmit)="submit()">
        <mat-form-field appearance="fill">
          <mat-label>Language</mat-label>
          <mat-select formControlName="lang">
            <mat-option
              *ngFor="let lang of service.languages$ | async"
              [value]="lang"
              >{{ lang }}</mat-option
            >
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="fill">
          <mat-label>Key</mat-label>
          <input matInput formControlName="key" />
        </mat-form-field>
        <mat-form-field appearance="fill">
          <mat-label>Value</mat-label>
          <input matInput formControlName="value" />
        </mat-form-field>
        <button mat-raised-button color="primary" type="submit">Set</button>
      </form>

      <a
        mat-raised-button
        color="primary"
        [href]="csvDownloadFile$ | async"
        [download]="csvDownloadName$ | async"
        [disabled]="(csvDownloadFile$ | async) === null"
      >
        Download
      </a>
      <table>
        <tr>
          <th>Translation Key</th>
          <th>en</th>
          <th>{{ form.get("lang").value }}</th>
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
    `,
  ],
})
export class AppComponent {
  form = this.fb.group({
    lang: this.fb.control(""),
    key: this.fb.control(""),
    value: this.fb.control(""),
  });

  onlyMissing$ = new BehaviorSubject<boolean>(false);
  onlyDupes$ = new BehaviorSubject<boolean>(false);

  constructor(
    private fb: FormBuilder,
    public service: LocalizationsService,
    private sanitizer: DomSanitizer
  ) {}

  translations$ = combineLatest([
    this.form.get("lang").valueChanges,
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

  csvDownloadName$ = this.form.get("lang").valueChanges.pipe(
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

  submit() {
    console.log(this.form.value);
    const { lang, key, value } = this.form.value;
    this.service.set(lang, key, value);
  }

  blockAPI(event: MatSlideToggleChange) {
    this.service.blockAPI(event.checked);
  }
}
