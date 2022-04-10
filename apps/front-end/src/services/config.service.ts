import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Config } from "@pwa-translation-manager/api";
import { RxState } from "@rx-angular/state";
import { Observable, timer } from "rxjs";
import { switchMap } from "rxjs/operators";

import { NotificationService } from "./notification.service";

@Injectable({ providedIn: "root" })
export class ConfigService extends RxState<Config> {
  constructor(
    private http: HttpClient,
    private notification: NotificationService
  ) {
    super();

    this.connect(
      timer(0, 5000).pipe(switchMap(() => this.http.get<Config>(`/config`)))
    );
  }

  blockAPI(checked: boolean) {
    let method: () => Observable<unknown>;
    if (checked) {
      method = () => this.http.put(`/config/block`, {});
    } else {
      method = () => this.http.delete(`/config/block`);
    }

    method().subscribe(() => {
      this.notification.success(
        `successfully ${checked ? "set" : "unset"} API block`
      );
    });
  }
}
