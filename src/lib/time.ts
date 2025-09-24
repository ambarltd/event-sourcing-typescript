// Sane utilities for dealing with time.
export { DateOnly, TimeOfDay, POSIX };

import { DateTime } from 'luxon';
import * as s from '@/lib/json/schema';
import * as d from '@/lib/json/decoder';

// POSIX time is the nominal time since 1970-01-01 00:00 UTC.
// Like DateTime, but without timezone confusion.
class POSIX {
  static fromDate(d: Date): POSIX {
    return new POSIX(d.valueOf());
  }

  static now(): POSIX {
    return new POSIX(Date.now());
  }

  // The number of milliseconds for this date since midnight at the beginning
  // of January 1, 1970, UTC.
  value: number;
  constructor(n: number) {
    this.value = n;
  }

  toDate(): Date {
    return new Date(this.value);
  }

  greaterThan(other: POSIX) {
    return this.value > other.value;
  }

  compare(other: POSIX): number {
    return this.value > other.value ? 1 : this.value < other.value ? -1 : 0;
  }

  static fromUTCDateAndTime(date: DateOnly, time: TimeOfDay): POSIX {
    const s = `${date.pretty()}T${time.pretty()}Z`;
    const luxonDate = DateTime.fromISO(s, { zone: 'UTC' });
    return POSIX.fromDate(luxonDate.toJSDate());
  }

  toUTCDateAndTime(): { date: DateOnly; time: TimeOfDay } {
    const dt = DateTime.fromMillis(this.value, { zone: 'UTC' });
    const date = new DateOnly(dt.year, dt.month, dt.day);
    const time = TimeOfDay.fromParts({
      hours: dt.hour,
      minutes: dt.minute,
      seconds: dt.second,
    });
    return { date, time };
  }

  toLocalDateAndTime(): { date: DateOnly; time: TimeOfDay } {
    const dt = DateTime.fromMillis(this.value, { zone: 'UTC' }).toLocal();
    const date = new DateOnly(dt.year, dt.month, dt.day);
    const time = TimeOfDay.fromParts({
      hours: dt.hour,
      minutes: dt.minute,
      seconds: dt.second,
    });
    return { date, time };
  }

  static schema: s.Schema<POSIX> = s.number.dimap(
    (n) => new POSIX(n),
    (p) => p.value,
  );
}

// pad to two digits
const padded = (v: number) => v.toString().padStart(2, '0');

// Year, month and day.
class DateOnly {
  readonly year: number;
  readonly month: number; // 1-12
  readonly day: number; // 1-30ish

  constructor(year: number, month: number, day: number) {
    this.year = year;
    this.month = month;
    this.day = day;
  }

  static today(): DateOnly {
    return DateOnly.fromDate(new Date());
  }

  static fromDate(date: Date): DateOnly {
    return new DateOnly(
      date.getFullYear(),
      date.getMonth() + 1,
      date.getDate(),
    );
  }

  pretty() {
    return `${this.year}-${padded(this.month)}-${padded(this.day)}`;
  }

  static schema: s.Schema<DateOnly> = s.string.then(
    (str) => {
      const parts = str.split('-');
      if (parts.length !== 3) {
        return d.fail('Invalid Date');
      }
      const year = parseInt(parts[0] as string, 10);
      const month = parseInt(parts[1] as string, 10);
      const day = parseInt(parts[2] as string, 10);

      if (isNaN(year) || isNaN(month) || isNaN(day)) {
        return d.fail('Invalid Date');
      }

      return d.succeed(new DateOnly(year, month, day));
    },
    (date) => date.pretty(),
  );

  greaterThan(other: DateOnly) {
    return this.compare(other) == 1;
  }

  compare(other: DateOnly): number {
    return this.year > other.year
      ? 1
      : this.year < other.year
        ? -1
        : this.month > other.month
          ? 1
          : this.month < other.month
            ? -1
            : this.day > other.day
              ? 1
              : this.day < other.day
                ? -1
                : 0;
  }

  addMonths(months: number): DateOnly {
    const luxonDate = DateTime.fromObject({
      year: this.year,
      month: this.month,
      day: this.day,
    });
    const newLuxonDate = luxonDate.plus({ months });

    return new DateOnly(
      newLuxonDate.year,
      newLuxonDate.month,
      newLuxonDate.day,
    );
  }
}

class TimeOfDay {
  constructor(readonly seconds: number) {}

  static fromParts({
    hours,
    minutes,
    seconds,
  }: {
    hours: number;
    minutes: number;
    seconds: number;
  }): TimeOfDay {
    return new TimeOfDay(hours * 60 * 60 + minutes * 60 + seconds);
  }

  // HH:MM:SS
  pretty() {
    const hours = padded(Math.floor(this.seconds / (60 * 60)));
    const minutes = padded(Math.floor(this.seconds / 60) % 60);
    const seconds = padded(this.seconds % 60);
    return `${hours}:${minutes}:${seconds}`;
  }
}
