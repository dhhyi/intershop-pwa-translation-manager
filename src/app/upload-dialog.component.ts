import { Component, ElementRef, ViewChild } from "@angular/core";
import { faInfoCircle, faPaperclip } from "@fortawesome/free-solid-svg-icons";

import { NotificationService } from "../services/notification.service";
@Component({
  selector: "app-upload",
  template: `
    <h1 mat-dialog-title>Upload</h1>
    <div mat-dialog-content>
      <mat-expansion-panel
        [expanded]="panelOpenState"
        (opened)="panelOpenState = true"
        (closed)="panelOpenState = false"
      >
        <mat-expansion-panel-header>
          <mat-panel-title
            ><fa-icon [icon]="faInfoCircle" size="lg"></fa-icon
            >Information</mat-panel-title
          >
          <mat-panel-description *ngIf="!panelOpenState">
            Click to expand
          </mat-panel-description>
        </mat-expansion-panel-header>
        <ng-template matExpansionPanelContent>
          <p>Upload is supported in the following formats:</p>
          <ul>
            <li>
              <b>CSV</b>
              <p>
                with translation keys in the 1st column and translations in the
                3rd column. (usually the format supplied by third parties). When
                exporting from Excel, make sure to save the CSV in:
              </p>
              <pre>CSV UTF-8 (Comma delimited) (*.csv)</pre>
            </li>
            <li>
              <b>JSON</b>
              <p>
                with key-value pairs mapping translation keys to translations.
                (usually our own format)
              </p>
            </li>
          </ul>
        </ng-template>
      </mat-expansion-panel>
      <div class="upload-file">
        <input
          type="file"
          style="display: none"
          #fileInput
          accept=".csv,.json"
          (change)="onChangeFileInput()"
        />
        <button
          mat-button
          color="primary"
          class="file-select-button"
          (click)="onClickFileInputButton()"
          cdkFocusInitial
        >
          <fa-icon [icon]="faPaperclip" size="lg"></fa-icon>
          Select a file
        </button>
        <p class="file-name" *ngIf="!file; else fileName">No file selected!</p>
        <ng-template #fileName>
          <p class="file-name">{{ file?.name }}</p>
        </ng-template>
      </div>
    </div>
    <div class="upload-properties">
      <mat-radio-group class="radio-group" [(ngModel)]="uploadType">
        <mat-radio-button
          class="upload-properties-button"
          *ngFor="let t of uploadTypes | keyvalue"
          [value]="t.key"
          [matTooltip]="t.value"
        >
          {{ t.key }}
        </mat-radio-button>
      </mat-radio-group>
    </div>
    <div mat-dialog-actions>
      <button
        mat-raised-button
        color="primary"
        [matDialogClose]="{data, uploadType}"
        [disabled]="!file"
      >
        Upload
      </button>
      <button mat-button [matDialogClose]="undefined">Cancel</button>
    </div>
  `,
  styles: [
    `
      .ng-fa-icon {
        margin-right: 24px;
      }
      .mat-dialog-content {
        padding-bottom: 24px;
      }
      .upload-file {
        padding-top: 24px;
        display: flex;
      }
      .upload-file > * {
        margin-right: 24px;
      }
      .mat-radio-group {
        margin-left: 24px;
      }
      .mat-radio-button {
        padding-right: 24px;
      }
    `,
  ],
})
export class UploadDialogComponent {
  @ViewChild("fileInput")
  fileInput: ElementRef;

  panelOpenState: boolean;

  file: File | null = null;
  data: string;
  uploadType: keyof UploadDialogComponent["uploadTypes"] = "overwrite";

  faInfoCircle = faInfoCircle;
  faPaperclip = faPaperclip;

  uploadTypes = {
    replace: "Replace existing translations with the new ones.",
    overwrite:
      "Overwrite all existing translations with the new ones but keep the old ones not part of the upload.",
    add: "Only add new translations from the upload, keep all existing translations.",
  };

  constructor(private notification: NotificationService) {}

  onClickFileInputButton(): void {
    this.fileInput.nativeElement.click();
  }

  onChangeFileInput() {
    const files: { [key: string]: File } = this.fileInput.nativeElement.files;
    this.file = files[0];
    console.log(this.file);

    this.file
      .text()
      .then((data) => {
        this.data = data;
        this.notification.success(`Successfully read "${files[0]?.name}"`);
      })
      .catch((err) => {
        this.file = undefined;
        this.notification.error(`Error reading "${files[0]?.name}": ${err}`);
      });
  }
}
