import { Component, Inject } from "@angular/core";
import { FormControl } from "@angular/forms";
import { MAT_DIALOG_DATA } from "@angular/material/dialog";
import { DomSanitizer, SafeHtml } from "@angular/platform-browser";
import { TranslateCompiler, TranslateParser } from "@ngx-translate/core";
import { Observable } from "rxjs";
import { map, startWith } from "rxjs/operators";

import { LocalizationWithBaseType } from "../services/localizations.service";

@Component({
  selector: "app-edit",
  template: `
    <h1 mat-dialog-title>{{ key }}</h1>
    <div mat-dialog-content>
      <pre>{{ base | json }}</pre>
      <textarea
        cdkFocusInitial
        id="translation"
        cols="30"
        rows="5"
        [formControl]="translation"
      ></textarea>
      <div [innerHTML]="interpolation$ | async"></div>
    </div>
    <div mat-dialog-actions>
      <button
        mat-raised-button
        color="primary"
        [matDialogClose]="translation.value"
      >
        OK
      </button>
      <button mat-button [matDialogClose]="undefined">Cancel</button>
    </div>
  `,
  styles: [
    `
      #translation {
        width: 100%;
      }
    `,
  ],
})
export class EditDialogComponent {
  key: string;
  base: string;
  translation = new FormControl("");

  interpolation$: Observable<SafeHtml>;

  constructor(
    @Inject(MAT_DIALOG_DATA)
    data: {
      element: LocalizationWithBaseType;
    },
    private compiler: TranslateCompiler,
    private parser: TranslateParser,
    sanitizer: DomSanitizer
  ) {
    this.key = data.element.key;
    this.base = data.element.base;
    this.translation.setValue(data.element.tr);
    this.interpolation$ = this.translation.valueChanges.pipe(
      startWith(data.element.tr),
      map((tr) =>
        this.renderTranslation(tr, {
          "0": "#1",
          "1": "#2",
          "2": "#3",
        })
      ),
      map((interpolated) => sanitizer.bypassSecurityTrustHtml(interpolated))
    );
  }

  private renderTranslation(tr: string, params: object): string {
    try {
      return this.parser.interpolate(
        this.compiler.compile(tr, undefined),
        params
      );
    } catch (err) {
      return err instanceof Error ? err.message : err.toString();
    }
  }
}
