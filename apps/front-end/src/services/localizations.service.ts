import { HttpClient, HttpHeaders } from "@angular/common/http";
import { Injectable } from "@angular/core";
import {
  Override,
  OverridesList,
  Translations,
} from "@pwa-translation-manager/api";
import { memoize } from "lodash-es";
import { BehaviorSubject, combineLatest, Observable } from "rxjs";
import {
  filter,
  map,
  pairwise,
  shareReplay,
  switchMap,
  withLatestFrom,
} from "rxjs/operators";

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

export type OverridesType = Override & {
  key: string;
  ignored: boolean;
};

/* eslint-disable @typescript-eslint/member-ordering */

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
        this.http.get<Translations>(`/localizations/${lang}`, {
          params: { exact: true },
        })
      ),
      shareReplay(1)
    )
  );

  private convertToString(obj: unknown): string {
    return typeof obj === "string" ? obj : JSON.stringify(obj);
  }

  private ignored$ = this.config.select("ignored").pipe(map((x) => x || []));

  localizationsWithBase$ = (
    lang: string
  ): Observable<LocalizationWithBaseType[]> =>
    combineLatest([
      this.config
        .select("baseLang")
        .pipe(switchMap((baseLang) => this.localizations$(baseLang))),
      this.localizations$(lang),
      this.ignored$,
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

  googleTranslate(lang: string, text: string): Observable<string> {
    return this.http.post(
      "/translate",
      { lang, text },
      { responseType: "text" }
    );
  }

  upload(lang: string, type: string, data: string) {
    this.http
      .post(`/import/${lang}`, data, {
        headers: new HttpHeaders().set("Content-Type", "text/plain"),
        params: { type },
        responseType: "text",
      })
      .subscribe((message) => {
        this.notification.success(
          `successfully uploaded translations for ${lang} with strategy ${type}: ${message}`
        );
        this.triggerUpdate$.next();
      });
  }

  private overridesList$ = memoize((lang: string) =>
    this.triggerUpdate$.pipe(
      switchMap(() => this.http.get<OverridesList>(`/overrides-list/${lang}`)),
      shareReplay(1)
    )
  );

  overrides$ = memoize(
    (lang: string, key: string): Observable<OverridesType[]> =>
      this.triggerUpdate$.pipe(
        switchMap(() =>
          this.http
            .get<Override[]>(`/overrides/${lang ? lang + "/" : ""}${key}`)
            .pipe(
              withLatestFrom(
                this.ignored$.pipe(map((ignored) => ignored.includes(key)))
              ),
              map(([overrides, ignored]) =>
                overrides.map((o) => ({ ...o, key, ignored }))
              )
            )
        ),
        shareReplay(1)
      ),
    (lang, key) => `${lang}-${key}`
  );
}
