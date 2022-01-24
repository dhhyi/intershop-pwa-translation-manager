import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { RxState } from "@rx-angular/state";
import { combineLatest, Observable, timer } from "rxjs";
import { first, switchMap } from "rxjs/operators";

import { APIService } from "./api.service";
import { NotificationService } from "./notification.service";

export interface ConfigType {
  baseLang: string;
  block: boolean;
  ignored: string[];
  languages: string[];
  maintenance: boolean;
  translateAvailable: boolean;
}

@Injectable({ providedIn: "root" })
export class ConfigService extends RxState<ConfigType> {
  constructor(
    private http: HttpClient,
    private apiService: APIService,
    private notification: NotificationService
  ) {
    super();

    this.connect(
      combineLatest([timer(0, 5000), this.apiService.apiPasswordHeaders$]).pipe(
        switchMap(([, headers]) =>
          this.http
            .get<Record<string, unknown>>(`/config`, { headers })
            .pipe(this.apiService.errorHandler())
        )
      )
    );
  }

  blockAPI(checked: boolean) {
    let method: (headers: any) => Observable<unknown>;
    if (checked) {
      method = (headers) => this.http.put(`/config/block`, {}, { headers });
    } else {
      method = (headers) => this.http.delete(`/config/block`, { headers });
    }
    this.apiService.apiPasswordHeaders$
      .pipe(
        first(),
        switchMap((headers) =>
          method(headers).pipe(this.apiService.errorHandler())
        )
      )
      .subscribe(() => {
        this.notification.success(
          `successfully ${checked ? "set" : "unset"} API block`
        );
      });
  }
}
