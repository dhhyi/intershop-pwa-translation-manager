import { Component, Inject, OnDestroy } from "@angular/core";
import { FormBuilder, FormControl, FormGroup } from "@angular/forms";
import { MAT_DIALOG_DATA } from "@angular/material/dialog";
import { DomSanitizer, SafeHtml } from "@angular/platform-browser";
import { TranslateCompiler, TranslateParser } from "@ngx-translate/core";
import { combineLatest, interval, merge, Observable, of, Subject } from "rxjs";
import { map, startWith, takeUntil } from "rxjs/operators";

import { LocalizationWithBaseType } from "../services/localizations.service";

@Component({
  selector: "app-edit",
  template: `
    <h1 mat-dialog-title>{{ key }}</h1>
    <div mat-dialog-content>
      <pre>{{ base | json }}</pre>
      <mat-card>
        <div [innerHTML]="interpolationBase$ | async"></div>
      </mat-card>
      <ng-container *ngFor="let arg of parameters.controls | keyvalue">
        <div class="argument">
          <span>{{ arg.key }}: </span>
          <mat-radio-group
            aria-label="Select an option"
            [formControl]="parameterSelection[arg.key]"
          >
            <mat-radio-button value="default" (click)="setDefault(arg.key)"
              >default</mat-radio-button
            >
            <mat-radio-button value="counter" (click)="setCounter(arg.key)"
              >counter</mat-radio-button
            >
            <mat-radio-button
              value="switch"
              (click)="setToggle(arg.key, toggle.checked)"
              ><mat-slide-toggle
                #toggle
                (change)="setToggle(arg.key, $event.checked)"
              ></mat-slide-toggle
            ></mat-radio-button>
            <mat-radio-button
              value="custom"
              (click)="setText(arg.key, txt.value)"
              ><input #txt type="text" (keyup)="setText(arg.key, txt.value)"
            /></mat-radio-button>
          </mat-radio-group>
        </div>
      </ng-container>
      <textarea
        cdkFocusInitial
        id="translation"
        cols="30"
        rows="5"
        [formControl]="translation"
      ></textarea>
      <mat-card>
        <div [innerHTML]="interpolation$ | async"></div>
      </mat-card>
    </div>
    <div mat-dialog-actions>
      <button
        mat-raised-button
        color="primary"
        [matDialogClose]="translation.value"
        [disabled]="translation.value === original"
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
      .mat-card {
        margin-top: 5px;
        margin-bottom: 5px;
      }
      .argument {
        padding: 5px;
      }
      .mat-radio-button {
        margin-left: 10px;
      }
    `,
  ],
})
export class EditDialogComponent implements OnDestroy {
  key: string;
  base: string;
  readonly original: string;
  parameters: FormGroup;
  parameterSelection: Record<string, FormControl>;
  translation = this.fb.control("");

  interpolationBase$: Observable<SafeHtml>;
  interpolation$: Observable<SafeHtml>;

  private destroy$ = new Subject();

  constructor(
    private fb: FormBuilder,
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
    this.original = data.element.tr;

    const args = this.parseArgumentNames(data.element.base);
    this.parameters = this.fb.group(
      args.reduce((acc, k) => ({ ...acc, [k]: this.fb.control("") }), {})
    );
    this.parameterSelection = args.reduce(
      (acc, k) => ({ ...acc, [k]: this.fb.control("") }),
      {}
    );

    const params = this.parameters.valueChanges.pipe(startWith({}));

    this.interpolationBase$ = combineLatest([of(this.base), params]).pipe(
      map(([tr, p]) => this.renderTranslation(tr, p)),
      map((interpolated) => sanitizer.bypassSecurityTrustHtml(interpolated))
    );

    this.translation.setValue(data.element.tr);
    this.interpolation$ = combineLatest([
      this.translation.valueChanges.pipe(startWith(data.element.tr)),
      params,
    ]).pipe(
      map(([tr, p]) => this.renderTranslation(tr, p)),
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

  private parseArgumentNames(tr: string): string[] {
    const vars: string[] = [];
    const regex = /\{\{\s*(\w+).*?\}\}/g;
    for (let m: RegExpExecArray; (m = regex.exec(tr)); ) {
      const match = m[1];
      if (!vars.includes(match)) vars.push(match);
    }
    return vars;
  }

  setDefault(arg: string) {
    this.parameters.get(arg).setValue(`#${arg}#`);
  }

  setCounter(arg: string) {
    setTimeout(() => {
      interval(1000)
        .pipe(
          map((no) => no % 4),
          takeUntil(
            merge(this.parameterSelection[arg].valueChanges, this.destroy$)
          )
        )
        .subscribe((val) => {
          this.parameters.get(arg).setValue(val);
        });
    }, 500);
  }

  setToggle(arg: string, checked: boolean) {
    this.parameterSelection[arg].setValue("switch");
    this.parameters.controls[arg].setValue(checked);
  }

  setText(arg: string, value: string) {
    this.parameterSelection[arg].setValue("custom");
    this.parameters.controls[arg].setValue(value);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
