import {
  HttpInterceptor,
  HttpHandler,
  HttpRequest,
  HttpErrorResponse,
  HttpHeaders,
} from "@angular/common/http";
import { Injectable } from "@angular/core";
import { BehaviorSubject, EMPTY } from "rxjs";
import { catchError } from "rxjs/operators";

import { NotificationService } from "./notification.service";

@Injectable({ providedIn: "root" })
export class AuthInterceptor implements HttpInterceptor {
  private apiPassword$ = new BehaviorSubject<string>(
    sessionStorage.getItem("API_PASSWORD") || ""
  );

  private headers() {
    if (this.apiPassword$.value) {
      return new HttpHeaders({ Authorization: this.apiPassword$.value });
    }
    return undefined;
  }

  constructor(private notification: NotificationService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler) {
    return next.handle(req.clone({ headers: this.headers() })).pipe(
      catchError((err) => {
        if (err instanceof HttpErrorResponse && err.status === 401) {
          const pass = window.prompt("Enter API password");
          this.apiPassword$.next(pass);
          sessionStorage.setItem("API_PASSWORD", pass);
        } else if (err instanceof HttpErrorResponse && err.status === 0) {
          this.notification.error("Backend unavailable");
        } else {
          this.notification.error(
            typeof err.error === "string" ? err.error : err.message
          );
        }
        return EMPTY;
      })
    );
  }
}
