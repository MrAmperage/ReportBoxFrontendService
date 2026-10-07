import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export default class DateTimeService {
  ToTimezone(Date: Date, TimeZone: string) {}
  ToUtc(Date: Date) {}
}
