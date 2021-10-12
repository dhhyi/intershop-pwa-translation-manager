import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { EMPTY } from "rxjs";
import { catchError } from "rxjs/operators";

import { NotificationService } from "./notification.service";

@Injectable({ providedIn: "root" })
export class LocalizationsService {
  constructor(
    private http: HttpClient,
    private notification: NotificationService
  ) {}

  localizations$ =
    this.http.get<Record<string, string>>(`/localizations/en_US`);

  set(lang: string, key: string, value: string) {
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
}
