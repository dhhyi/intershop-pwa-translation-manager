import { CommonModule } from "@angular/common";
import { HttpClientModule, HTTP_INTERCEPTORS } from "@angular/common/http";
import { NgModule } from "@angular/core";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { MatAutocompleteModule } from "@angular/material/autocomplete";
import { MatButtonModule } from "@angular/material/button";
import { MatButtonToggleModule } from "@angular/material/button-toggle";
import { MatCardModule } from "@angular/material/card";
import { MatCheckboxModule } from "@angular/material/checkbox";
import { MatDialogModule } from "@angular/material/dialog";
import { MatExpansionModule } from "@angular/material/expansion";
import { MatInputModule } from "@angular/material/input";
import { MatMenuModule } from "@angular/material/menu";
import { MatPaginatorModule } from "@angular/material/paginator";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatRadioModule } from "@angular/material/radio";
import { MatSelectModule } from "@angular/material/select";
import { MatSlideToggleModule } from "@angular/material/slide-toggle";
import { MatSortModule } from "@angular/material/sort";
import { MatTableModule } from "@angular/material/table";
import { MatToolbarModule } from "@angular/material/toolbar";
import { MatTooltipModule } from "@angular/material/tooltip";
import { BrowserModule } from "@angular/platform-browser";
import { BrowserAnimationsModule } from "@angular/platform-browser/animations";
import { RouterModule } from "@angular/router";
import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";
import { TranslateCompiler, TranslateModule } from "@ngx-translate/core";
import { ToastrModule } from "ngx-toastr";

import { PWATranslateCompiler } from "../ish-pwa/pwa-translate-compiler";
import { AuthInterceptor } from "../services/auth.interceptor";

import { AppComponent } from "./app.component";
import { ConfirmDialogComponent } from "./confirm-dialog.component";
import { EditDialogComponent } from "./edit-dialog.component";
import { TranslationDetailComponent } from "./translation-detail.component";
import { TranslationTableComponent } from "./translation-table.component";
import { UploadDialogComponent } from "./upload-dialog.component";

@NgModule({
  declarations: [
    AppComponent,
    EditDialogComponent,
    ConfirmDialogComponent,
    UploadDialogComponent,
    TranslationTableComponent,
    TranslationDetailComponent,
  ],
  imports: [
    BrowserModule,
    CommonModule,
    HttpClientModule,
    BrowserAnimationsModule,
    FormsModule,
    ReactiveFormsModule,
    MatToolbarModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatInputModule,
    MatCheckboxModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatTooltipModule,
    FontAwesomeModule,
    MatDialogModule,
    MatAutocompleteModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatRadioModule,
    MatSelectModule,
    ToastrModule.forRoot({
      preventDuplicates: true,
    }),
    MatSlideToggleModule,
    MatMenuModule,
    MatExpansionModule,
    TranslateModule.forRoot({
      useDefaultLang: false,
      compiler: { provide: TranslateCompiler, useClass: PWATranslateCompiler },
    }),
    RouterModule.forRoot([
      {
        path: "",
        component: TranslationTableComponent,
      },
      {
        path: "key/:key",
        component: TranslationDetailComponent,
      },
    ]),
  ],
  providers: [
    { provide: HTTP_INTERCEPTORS, multi: true, useClass: AuthInterceptor },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
