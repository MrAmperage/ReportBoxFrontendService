import { Injectable } from '@angular/core';
import { DateTime } from 'luxon';

@Injectable({ providedIn: 'root' })
export default class DateTimeService {
  private TimeZone = 'Asia/Bangkok';

  DateToTimeZone(Value: Date): Date {
    return DateTime.fromJSDate(Value)
      .setZone(this.TimeZone)
      .setZone('local', { keepLocalTime: true })
      .toJSDate();
  }

  DateToUtc(Value: Date): Date {
    return DateTime.fromJSDate(Value)
      .setZone(this.TimeZone, { keepLocalTime: true })
      .toUTC()
      .toJSDate();
  }
}
