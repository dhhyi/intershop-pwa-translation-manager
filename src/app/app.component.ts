import { Component } from "@angular/core";

import { LocalizationsService } from "../services/localizations.service";

@Component({
  selector: "app-root",
  template: ` <h1>TEST</h1>
    <pre>{{ service.localizations$ | async | json }}</pre>`,
  styles: [],
})
export class AppComponent {
  constructor(public service: LocalizationsService) {}
}
