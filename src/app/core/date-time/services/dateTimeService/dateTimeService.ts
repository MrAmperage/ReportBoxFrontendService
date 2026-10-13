import { Injectable } from '@angular/core';
import { transpose } from 'date-fns';
import { TZDate, tz } from '@date-fns/tz';

@Injectable({ providedIn: 'root' })
export default class DateTimeService {
  DateToTimeZone(Value: Date, TimeZone: string): Date {
    const ZonedDate = new TZDate(Value.getTime(), TimeZone);

    return transpose(ZonedDate, Date);
  }

  DateToUtc(Value: Date, TimeZone: string): Date {
    const ZonedDate = transpose(Value, tz(TimeZone));
    return new Date(ZonedDate.getTime());
  }
}
