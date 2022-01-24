import { HttpClient, HttpHeaders } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { memoize } from "lodash-es";
import { BehaviorSubject, combineLatest, Observable } from "rxjs";
import {
  filter,
  first,
  map,
  pairwise,
  shareReplay,
  switchMap,
} from "rxjs/operators";

import { APIService } from "./api.service";
import { ConfigService } from "./config.service";
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
    private apiService: APIService,
    private config: ConfigService,
    private notification: NotificationService
  ) {
    config
      .select("maintenance")
      .pipe(
        pairwise(),
        filter(([before, after]) => before && !after)
      )
      .subscribe(() => {
        this.triggerUpdate$.next();
      });
  }

  private triggerUpdate$ = new BehaviorSubject<void>(undefined);

  private localizations$ = memoize((lang: string) =>
    this.triggerUpdate$.pipe(
      switchMap(() =>
        this.http
          .get<Record<string, string>>(`/localizations/${lang}`, {
            params: { exact: true },
          })
          .pipe(this.apiService.errorHandler())
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
      this.config
        .select("baseLang")
        .pipe(switchMap((baseLang) => this.localizations$(baseLang))),
      this.localizations$(lang),
      this.config.select("ignored").pipe(map((x) => x || [])),
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

  set(lang: string, key: string, value: unknown) {
    this.apiService.apiPasswordHeaders$
      .pipe(
        first(),
        switchMap((headers) =>
          this.http
            .put(`/localizations/${lang}/${key}`, value, {
              headers: new HttpHeaders(headers).set(
                "Content-Type",
                "text/plain"
              ),
            })
            .pipe(this.apiService.errorHandler())
        )
      )
      .subscribe(() => {
        this.notification.success(`successfully set "${key}" for ${lang}`);
        this.triggerUpdate$.next();
      });
  }

  delete(lang: string, key: string) {
    this.apiService.apiPasswordHeaders$
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
            .pipe(this.apiService.errorHandler())
        )
      )
      .subscribe(() => {
        this.notification.success(`successfully deleted "${key}" for ${lang}`);
        this.triggerUpdate$.next();
      });
  }

  translate(lang: string, text: string): Observable<string> {
    return this.apiService.apiPasswordHeaders$.pipe(
      first(),
      switchMap((headers) =>
        this.http
          .post("/translate", { lang, text }, { responseType: "text", headers })
          .pipe(this.apiService.errorHandler())
      )
    );
  }

  upload(locale: string, type: string, data: string) {
    this.apiService.apiPasswordHeaders$
      .pipe(
        first(),
        switchMap((headers) =>
          this.http
            .post(`/import`, data, {
              headers: new HttpHeaders(headers).set(
                "Content-Type",
                "text/plain"
              ),
              params: { type, locale },
            })
            .pipe(this.apiService.errorHandler())
        )
      )
      .subscribe(() => {
        this.notification.success(
          `successfully uploaded translations for ${locale} with strategy ${type}`
        );
        this.triggerUpdate$.next();
      });
  }
}
