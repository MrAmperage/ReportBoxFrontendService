import { Injectable } from '@angular/core';
import { DateTime } from 'luxon';

@Injectable({ providedIn: 'root' })
export default class DateTimeService {
  private TimeZone = 'Asia/Bangkok';

  DateToTimeZone(value: Date): Date {
    return DateTime.fromJSDate(value)
      .setZone(this.TimeZone)
      .setZone('local', { keepLocalTime: true })
      .toJSDate();
  }

  DateToUtc(value: Date): Date {
    return DateTime.fromJSDate(value)
      .setZone(this.TimeZone, { keepLocalTime: true })
      .toUTC()
      .toJSDate();
  }
}
