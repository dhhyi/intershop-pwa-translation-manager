import { HttpErrorResponse } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { BehaviorSubject, EMPTY, ObservableInput } from "rxjs";
import { catchError, map } from "rxjs/operators";

import { NotificationService } from "./notification.service";

@Injectable({ providedIn: "root" })
export class APIService {
  constructor(private notification: NotificationService) {}

  private apiPassword$ = new BehaviorSubject<string>(
    sessionStorage.getItem("API_PASSWORD") || ""
  );

  apiPasswordHeaders$ = this.apiPassword$.pipe(
    map((pass) => ({
      Authorization: pass,
    }))
  );

  errorHandler = <T>() =>
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
}
