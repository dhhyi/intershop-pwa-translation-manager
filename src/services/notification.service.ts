import { Injectable } from "@angular/core";
import { ToastrService } from "ngx-toastr";

@Injectable({
  providedIn: "root",
})
export class NotificationService {
  constructor(private toastr: ToastrService) {}

  info(message: string) {
    console.log("INFO", message);
    this.toastr.info(message, undefined, {
      timeOut: 5000,
      positionClass: "toast-bottom-right",
    });
  }

  success(message: string) {
    console.log("SUCCESS", message);
    this.toastr.success(message, undefined, {
      timeOut: 5000,
      positionClass: "toast-bottom-right",
    });
  }

  warning(message: string) {
    console.warn("WARNING", message);
    this.toastr.warning(message, undefined, {
      timeOut: 10000,
      positionClass: "toast-bottom-right",
    });
  }

  error(message: string) {
    console.error("ERROR", message);
    this.toastr.error(message, undefined, {
      timeOut: 0,
      positionClass: "toast-bottom-right",
    });
  }
}
