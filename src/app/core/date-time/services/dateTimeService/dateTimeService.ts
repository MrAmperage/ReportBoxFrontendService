import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export default class DateTimeService {
  DateToTimeZone(Date: Date, TimeZone: string) {}

  DateToUtc(Date: Date, TimeZone: string) {}
}
