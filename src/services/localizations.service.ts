import {
  HttpClient,
  HttpErrorResponse,
  HttpHeaders,
} from "@angular/common/http";
import { Injectable } from "@angular/core";
import {
  BehaviorSubject,
  combineLatest,
  EMPTY,
  Observable,
  ObservableInput,
  timer,
} from "rxjs";
import { catchError, first, map, shareReplay, switchMap } from "rxjs/operators";

import { NotificationService } from "./notification.service";

export interface LocalizationWithBaseType {
  key: string;
  base: string;
  tr: string;
  missing: boolean;
  dupe: boolean;
}

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

  private apiPasswordHeaders$ = this.apiPassword$.pipe(
    map((pass) => ({
      Authorization: pass,
    }))
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

  private convertToString(obj: unknown): string {
    return typeof obj === "string" ? obj : JSON.stringify(obj);
  }

  localizationsWithBase$ = (
    lang: string
  ): Observable<LocalizationWithBaseType[]> =>
    combineLatest([this.localizations$("en"), this.localizations$(lang)]).pipe(
      map(([base, loc]) =>
        Object.keys(base).map((key) => ({
          key,
          base: this.convertToString(base[key]),
          tr: this.convertToString(loc[key]),
          missing: typeof loc[key] !== "string",
          dupe: loc[key] === base[key],
        }))
      )
    );

  private config$ = combineLatest([
    timer(0, 30000),
    this.apiPasswordHeaders$,
  ]).pipe(
    switchMap(([, headers]) =>
      this.http
        .get<Record<string, unknown>>(`/localizations/config`, { headers })
        .pipe(this.errorHandler())
    ),
    shareReplay(1)
  );

  set(lang: string, key: string, value: unknown) {
    this.apiPasswordHeaders$
      .pipe(
        first(),
        switchMap((headers) =>
          this.http
            .post(`/localizations/${lang}/${key}`, value, {
              headers: new HttpHeaders(headers).set(
                "Content-Type",
                "text/plain"
              ),
            })
            .pipe(this.errorHandler())
        )
      )
      .subscribe(() => {
        this.notification.success(`successfully set "${key}" for ${lang}`);
        this.triggerUpdate$.next();
      });
  }

  blockedAPI$ = combineLatest([timer(0, 5000), this.apiPasswordHeaders$]).pipe(
    switchMap(([, headers]) =>
      this.http
        .get<boolean>(`/localizations/config/block`, { headers })
        .pipe(this.errorHandler())
    )
  );

  blockAPI(checked: boolean) {
    let method: (headers: any) => Observable<unknown>;
    if (checked) {
      method = (headers) =>
        this.http.put(`/localizations/config/block`, {}, { headers });
    } else {
      method = (headers) =>
        this.http.delete(`/localizations/config/block`, { headers });
    }
    this.apiPasswordHeaders$
      .pipe(
        first(),
        switchMap((headers) => method(headers).pipe(this.errorHandler()))
      )
      .subscribe(() => {
        this.notification.success(
          `successfully ${checked ? "set" : "unset"} API block`
        );
      });
  }

  languages$ = this.config$.pipe(
    map((config) => (config?.languages as string[]) || [])
  );
}
