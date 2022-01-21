import {
  HttpClient,
  HttpErrorResponse,
  HttpHeaders,
} from "@angular/common/http";
import { Injectable } from "@angular/core";
import { isEqual, memoize } from "lodash-es";
import {
  BehaviorSubject,
  combineLatest,
  EMPTY,
  Observable,
  ObservableInput,
  timer,
} from "rxjs";
import {
  catchError,
  distinctUntilChanged,
  filter,
  first,
  map,
  pairwise,
  shareReplay,
  switchMap,
  withLatestFrom,
} from "rxjs/operators";

import { NotificationService } from "./notification.service";

export interface LocalizationWithBaseType {
  key: string;
  base: string;
  tr: string;
  missing: boolean;
  dupe: boolean;
  ignored: boolean;
}

@Injectable({ providedIn: "root" })
export class LocalizationsService {
  constructor(
    private http: HttpClient,
    private notification: NotificationService
  ) {
    this.maintenance$
      .pipe(
        pairwise(),
        filter(([before, after]) => before && !after)
      )
      .subscribe(() => {
        this.triggerUpdate$.next();
      });

    this.config$
      .pipe(
        map((config) => (config.translateAvailable as boolean) || false),
        distinctUntilChanged()
      )
      .subscribe(this.translateAvailable$);
  }

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
        this.notification.error(
          typeof err.error === "string" ? err.error : err.message
        );
      }
      return EMPTY;
    });

  private localizations$ = memoize((lang: string) =>
    this.triggerUpdate$.pipe(
      switchMap(() =>
        this.http
          .get<Record<string, string>>(`/localizations/${lang}`, {
            params: { exact: true },
          })
          .pipe(this.errorHandler())
      ),
      shareReplay(1)
    )
  );

  private convertToString(obj: unknown): string {
    return typeof obj === "string" ? obj : JSON.stringify(obj);
  }

  localizationsWithBase$ = (
    lang: string
  ): Observable<LocalizationWithBaseType[]> =>
    combineLatest([
      this.baseLang$.pipe(
        switchMap((baseLang) => this.localizations$(baseLang))
      ),
      this.localizations$(lang),
      this.ignoredKeys$,
    ]).pipe(
      map(([base, loc, ignored]) =>
        Object.keys(base).map((key) => ({
          key,
          base: this.convertToString(base[key]),
          tr: this.convertToString(loc[key]),
          missing: typeof loc[key] !== "string",
          dupe: loc[key] === base[key],
          ignored: ignored.includes(key),
        }))
      )
    );

  private config$ = combineLatest([
    timer(0, 30000),
    this.apiPasswordHeaders$,
  ]).pipe(
    switchMap(([, headers]) =>
      this.http
        .get<Record<string, unknown>>(`/config`, { headers })
        .pipe(this.errorHandler())
    ),
    shareReplay(1)
  );

  private ignoredKeys$ = this.config$.pipe(
    map((config) => (config?.ignored as string[]) || []),
    distinctUntilChanged<string[]>(isEqual)
  );

  private baseLang$ = this.config$.pipe(
    map((config) => (config.baseLang as string) || "en"),
    distinctUntilChanged()
  );

  translateAvailable$ = new BehaviorSubject<boolean>(false);

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

  delete(lang: string, key: string) {
    this.apiPasswordHeaders$
      .pipe(
        first(),
        switchMap((headers) =>
          this.http
            .delete(`/localizations/${lang}/${key}`, {
              headers: new HttpHeaders(headers).set(
                "Content-Type",
                "text/plain"
              ),
            })
            .pipe(this.errorHandler())
        )
      )
      .subscribe(() => {
        this.notification.success(`successfully deleted "${key}" for ${lang}`);
        this.triggerUpdate$.next();
      });
  }

  blockedAPI$ = combineLatest([timer(0, 5000), this.apiPasswordHeaders$]).pipe(
    switchMap(([, headers]) =>
      this.http
        .get<boolean>(`/config/block`, { headers })
        .pipe(this.errorHandler())
    )
  );

  blockAPI(checked: boolean) {
    let method: (headers: any) => Observable<unknown>;
    if (checked) {
      method = (headers) => this.http.put(`/config/block`, {}, { headers });
    } else {
      method = (headers) => this.http.delete(`/config/block`, { headers });
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

  maintenance$ = this.config$.pipe(
    withLatestFrom(this.languages$),
    map(
      ([config, languages]) =>
        (config?.maintenance as boolean) || !languages?.length
    )
  );

  translate(lang: string, text: string): Observable<string> {
    return this.apiPasswordHeaders$.pipe(
      first(),
      switchMap((headers) =>
        this.http
          .post("/translate", { lang, text }, { responseType: "text", headers })
          .pipe(this.errorHandler())
      )
    );
  }

  upload(lang: string, type: string, data: string) {
    this.apiPasswordHeaders$
      .pipe(
        first(),
        switchMap((headers) =>
          this.http
            .post(`/localizations/import/${lang}`, data, {
              headers: new HttpHeaders(headers).set(
                "Content-Type",
                "text/plain"
              ),
              params: { type },
            })
            .pipe(this.errorHandler())
        )
      )
      .subscribe(() => {
        this.notification.success(
          `successfully uploaded translations for ${lang} with strategy ${type}`
        );
        this.triggerUpdate$.next();
      });
  }
}
