import { Component, Inject } from "@angular/core";
import { MAT_DIALOG_DATA } from "@angular/material/dialog";

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
        rows="10"
        [(ngModel)]="translation"
      ></textarea>
    </div>
    <div mat-dialog-actions>
      <button mat-raised-button color="primary" [matDialogClose]="translation">
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
  translation: string;

  constructor(
    @Inject(MAT_DIALOG_DATA)
    data: {
      element: LocalizationWithBaseType;
    }
  ) {
    this.key = data.element.key;
    this.base = data.element.base;
    this.translation = data.element.tr;
  }
}
