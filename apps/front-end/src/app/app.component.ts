import { Component } from "@angular/core";

import { ConfigService } from "../services/config.service";

@Component({
  selector: "app-root",
  template: `
    <app-maintenance
      *ngIf="config.select('maintenance') | async; else normal"
    ></app-maintenance>
    <ng-template #normal>
      <router-outlet></router-outlet>
    </ng-template>
  `,
})
export class AppComponent {
  constructor(public config: ConfigService) {}
}
