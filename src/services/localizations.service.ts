import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";

@Injectable({ providedIn: "root" })
export class LocalizationsService {
  constructor(private http: HttpClient) {}

  localizations$ =
    this.http.get<Record<string, string>>(`/localizations/en_US`);
}
