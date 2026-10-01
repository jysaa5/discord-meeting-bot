import dayjs, { type Dayjs } from "dayjs";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const KST = "Asia/Seoul";

export function nowInKorea(): Dayjs {
  return dayjs().tz(KST);
}

export function createMeetingDateTime(date: string, time: string): Dayjs {
  return dayjs.tz(`${date} ${time}`, "YYYY-MM-DD HH:mm", KST);
}

export function toKoreaTime(dateTime: string | Date): Dayjs {
  return dayjs(dateTime).tz(KST);
}

export function formatKoreanTime(dateTime: Dayjs): string {
  const hour = dateTime.hour();
  const period = hour < 12 ? "오전" : "오후";
  const twelveHour = hour % 12 || 12;

  return `${period} ${twelveHour}:${dateTime.format("mm")}`;
}

export function isValidTime(time: string): boolean {
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time);
}
