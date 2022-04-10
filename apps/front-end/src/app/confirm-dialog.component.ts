import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-confirm-dialog',
  template: `<h1 mat-dialog-title>{{ data }}</h1>
    <div mat-dialog-actions>
      <button mat-button [mat-dialog-close]="false">No</button>
      <button
        mat-raised-button
        color="primary"
        [mat-dialog-close]="true"
        cdkFocusInitial
      >
        Yes
      </button>
    </div>`,
  styles: [],
})
export class ConfirmDialogComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA)
    public data: string
  ) {}
}
