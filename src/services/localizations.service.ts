import { HttpClient, HttpHeaders } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { memoize } from "lodash-es";
import { BehaviorSubject, combineLatest, Observable } from "rxjs";
import { filter, map, pairwise, shareReplay, switchMap } from "rxjs/operators";

import { ConfigService } from "./config.service";
import { NotificationService } from "./notification.service";

export interface LocalizationWithBaseType {
  key: string;
  base: string;
  tr: string;
  missing?: boolean;
  dupe?: boolean;
  ignored?: boolean;
  overridden?: boolean;
}

export interface OverridesType {
  id: string;
  lang: string;
  country: string;
  locale: string;
  theme: string;
  url: string;
  interpolated: string;
  value: string;
}

@Injectable({ providedIn: "root" })
export class LocalizationsService {
  constructor(
    private http: HttpClient,
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
        this.http.get<Record<string, string>>(`/localizations/${lang}`, {
          params: { exact: true },
        })
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
      this.overridesList$(lang),
    ]).pipe(
      map(([base, loc, ignored, overridden]) =>
        Object.keys(base).map<LocalizationWithBaseType>((key) => ({
          key,
          base: this.convertToString(base[key]),
          tr: this.convertToString(loc[key]),
          missing: typeof loc[key] !== "string",
          dupe: loc[key] === base[key],
          ignored: ignored.includes(key),
          overridden: overridden.includes(key),
        }))
      )
    );

  set(lang: string, key: string, value: unknown) {
    this.http
      .put(`/localizations/${lang}/${key}`, value, {
        headers: new HttpHeaders().set("Content-Type", "text/plain"),
      })
      .subscribe(() => {
        this.notification.success(`successfully set "${key}" for ${lang}`);
        this.triggerUpdate$.next();
      });
  }

  delete(lang: string, key: string) {
    this.http
      .delete(`/localizations/${lang}/${key}`, {
        headers: new HttpHeaders().set("Content-Type", "text/plain"),
      })
      .subscribe(() => {
        this.notification.success(`successfully deleted "${key}" for ${lang}`);
        this.triggerUpdate$.next();
      });
  }

  translate(lang: string, text: string): Observable<string> {
    return this.http.post(
      "/translate",
      { lang, text },
      { responseType: "text" }
    );
  }

  upload(locale: string, type: string, data: string) {
    this.http
      .post(`/import`, data, {
        headers: new HttpHeaders().set("Content-Type", "text/plain"),
        params: { type, locale },
      })
      .subscribe(() => {
        this.notification.success(
          `successfully uploaded translations for ${locale} with strategy ${type}`
        );
        this.triggerUpdate$.next();
      });
  }

  private overridesList$ = memoize((lang: string) =>
    this.triggerUpdate$.pipe(
      switchMap(() => this.http.get<string[]>(`/overrides-list/${lang}`)),
      shareReplay(1)
    )
  );

  overrides$ = memoize(
    (lang: string, key: string) =>
      this.triggerUpdate$.pipe(
        switchMap(() =>
          this.http.get<OverridesType[]>(
            `/overrides/${lang ? lang + "/" : ""}${key}`
          )
        ),
        shareReplay(1)
      ),
    (lang, key) => `${lang}-${key}`
  );
}
