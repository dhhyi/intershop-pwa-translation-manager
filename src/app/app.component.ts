import { Component } from "@angular/core";
import { FormBuilder } from "@angular/forms";

import { LocalizationsService } from "../services/localizations.service";

@Component({
  selector: "app-root",
  template: `
    <div>
      <h1>Set Translation</h1>
      <form matForm [formGroup]="form" (ngSubmit)="submit()">
        <mat-form-field appearance="fill">
          <mat-label>Language</mat-label>
          <mat-select formControlName="lang">
            <mat-option value="de">de</mat-option>
            <mat-option value="es">es</mat-option>
            <mat-option value="it">it</mat-option>
            <mat-option value="fr">fr</mat-option>
            <mat-option value="nl">nl</mat-option>
            <mat-option value="pt">pt</mat-option>
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
    </div>
  `,
  styles: [],
})
export class AppComponent {
  form = this.fb.group({
    lang: this.fb.control(""),
    key: this.fb.control(""),
    value: this.fb.control(""),
  });

  constructor(private fb: FormBuilder, private service: LocalizationsService) {}

  submit() {
    console.log(this.form.value);
    const { lang, key, value } = this.form.value;
    this.service.set(lang, key, value);
  }
}
