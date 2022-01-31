import { Component } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { combineLatest, pluck, switchMap } from "rxjs";

import { LocalizationsService } from "../services/localizations.service";

@Component({
  selector: "app-translation-detail",
  template: `<h1>key: {{ key$ | async }}</h1>
    <pre>{{ overrides$ | async | json }}</pre> `,
  styles: [``],
})
export class TranslationDetailComponent {
  key$ = this.route.params.pipe(pluck("key"));
  lang$ = this.route.queryParams.pipe(pluck("lang"));

  overrides$ = combineLatest([this.lang$, this.key$]).pipe(
    switchMap(([lang, key]) => this.service.overrides$(lang, key))
  );

  constructor(
    private route: ActivatedRoute,
    private service: LocalizationsService
  ) {}
}
