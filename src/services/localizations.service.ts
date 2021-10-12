import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { EMPTY, timer } from "rxjs";
import { catchError, map, switchMap } from "rxjs/operators";

import { NotificationService } from "./notification.service";

@Injectable({ providedIn: "root" })
export class LocalizationsService {
  constructor(
    private http: HttpClient,
    private notification: NotificationService
  ) {}

  localizations$ =
    this.http.get<Record<string, string>>(`/localizations/en_US`);

  private config$ = timer(0, 10000).pipe(
    switchMap(() =>
      this.http.get<Record<string, string>>(`/localizations/config`, {
        headers: {
          Authorization: "super-safe-password",
        },
      })
    )
  );

  set(lang: string, key: string, value: unknown) {
    this.http
      .post(`/localizations/${lang}/${key}`, value, {
        headers: {
          "Content-Type": "text/plain",
          Authorization: "super-safe-password",
        },
      })
      .pipe(
        catchError((err) => {
          this.notification.error(err.message);
          return EMPTY;
        })
      )
      .subscribe(() => {
        this.notification.success(`successfully set "${key}" for ${lang}`);
      });
  }

  blockedAPI$ = this.config$.pipe(map((config) => config?.block === "true"));

  blockAPI(checked: boolean) {
    this.set("config", "block", checked);
  }
}
