import { Injectable } from '@angular/core';
import { DateTime } from 'luxon';

@Injectable({ providedIn: 'root' })
export default class DateTimeService {
  Timezone!: string;

  DateToUTC(Value: Date): Date {
    if (!this.Timezone) {
      return Value;
    }

    return DateTime.fromObject(
      {
        year: Value.getFullYear(),
        month: Value.getMonth() + 1,
        day: Value.getDate(),
        hour: Value.getHours(),
        minute: Value.getMinutes(),
        second: Value.getSeconds(),
        millisecond: Value.getMilliseconds(),
      },
      {
        zone: this.Timezone,
      },
    )
      .toUTC()
      .toJSDate();
  }

  DateToTimezone(Value: Date): Date {
    if (!this.Timezone) {
      return Value;
    }

    return DateTime.fromJSDate(Value)
      .setZone(this.Timezone)
      .setZone('local', {
        keepLocalTime: true,
      })
      .toJSDate();
  }
}
