import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { Injectable } from "@angular/core";
import {
  BehaviorSubject,
  combineLatest,
  EMPTY,
  ObservableInput,
  timer,
} from "rxjs";
import { catchError, first, map, shareReplay, switchMap } from "rxjs/operators";

import { NotificationService } from "./notification.service";

@Injectable({ providedIn: "root" })
export class LocalizationsService {
  constructor(
    private http: HttpClient,
    private notification: NotificationService
  ) {}

  private triggerUpdate$ = new BehaviorSubject<void>(undefined);

  private apiPassword$ = new BehaviorSubject<string>(
    sessionStorage.getItem("API_PASSWORD") || ""
  );

  private errorHandler = <T>() =>
    catchError<T, ObservableInput<T>>((err) => {
      if (err instanceof HttpErrorResponse && err.status === 401) {
        const pass = window.prompt("Enter API password");
        this.apiPassword$.next(pass);
        sessionStorage.setItem("API_PASSWORD", pass);
      } else {
        this.notification.error(err.message);
      }
      return EMPTY;
    });

  localizations$ = (lang: string) =>
    this.triggerUpdate$.pipe(
      switchMap(() =>
        this.http
          .get<Record<string, string>>(`/localizations/${lang}`, {
            params: { exact: true },
          })
          .pipe(this.errorHandler())
      )
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

  private config$ = combineLatest([timer(0, 10000), this.apiPassword$]).pipe(
    switchMap(([, pass]) =>
      this.http
        .get<Record<string, unknown>>(`/localizations/config`, {
          headers: {
            Authorization: pass,
          },
        })
        .pipe(this.errorHandler())
    ),
    shareReplay(1)
  );

  set(lang: string, key: string, value: unknown) {
    this.apiPassword$
      .pipe(
        first(),
        switchMap((pass) =>
          this.http
            .post(`/localizations/${lang}/${key}`, value, {
              headers: {
                "Content-Type": "text/plain",
                Authorization: pass,
              },
            })
            .pipe(this.errorHandler())
        )
      )
      .subscribe(() => {
        this.notification.success(`successfully set "${key}" for ${lang}`);
        this.triggerUpdate$.next();
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
