import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { combineLatest, EMPTY, timer } from "rxjs";
import { catchError, map, shareReplay, switchMap } from "rxjs/operators";

import { NotificationService } from "./notification.service";

@Injectable({ providedIn: "root" })
export class LocalizationsService {
  constructor(
    private http: HttpClient,
    private notification: NotificationService
  ) {}

  localizations$ = (lang: string) =>
    this.http
      .get<Record<string, string>>(`/localizations/${lang}`, {
        params: { exact: true },
      })
      .pipe(
        catchError((err) => {
          this.notification.error(err.message);
          return EMPTY;
        })
      );

  localizationsWithBase$ = (lang: string) =>
    combineLatest([this.localizations$("en"), this.localizations$(lang)]).pipe(
      map(([base, loc]) =>
        Object.keys(base).map((key) => ({
          key,
          base: base[key],
          tr: loc[key],
          missing: loc[key] === undefined,
          dupe: loc[key] === base[key],
        }))
      )
    );

  private config$ = timer(0, 10000).pipe(
    switchMap(() =>
      this.http
        .get<Record<string, unknown>>(`/localizations/config`, {
          headers: {
            Authorization: "super-safe-password",
          },
        })
        .pipe(
          catchError((err) => {
            this.notification.error(err.message);
            return EMPTY;
          })
        )
    ),
    shareReplay(1)
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

  languages$ = this.config$.pipe(
    map((config) => (config?.languages as string[]) || [])
  );
}
