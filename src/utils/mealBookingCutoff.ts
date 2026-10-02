const LUNCH_CUTOFF_MINUTES = 8 * 60;
const DINNER_CUTOFF_MINUTES = 15 * 60;

export const TODAY_SLOTS_UNAVAILABLE_MESSAGE =
  "Today's lunch and dinner slots are no longer available. You can book a meal for tomorrow.";

export function toLocalYmd(date: Date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDaysYmd(ymd: string, days: number) {
  const [year, month, day] = ymd.split("-").map(Number);
  const date = new Date(year, (month || 1) - 1, day || 1);
  date.setDate(date.getDate() + days);
  return toLocalYmd(date);
}

function minutesSinceMidnight(now: Date) {
  return now.getHours() * 60 + now.getMinutes();
}

/** Calendar date (YYYY-MM-DD) in Asia/Kolkata (IST). */
export function toIndiaYmd(now: Date = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(now);
    const y = parts.find((p) => p.type === "year")?.value;
    const m = parts.find((p) => p.type === "month")?.value;
    const d = parts.find((p) => p.type === "day")?.value;
    if (y && m && d) return `${y}-${m}-${d}`;
  } catch {
    // fall through to device-local date
  }
  return toLocalYmd(now);
}

/** Local minutes since midnight in Asia/Kolkata (IST). */
export function getIndiaMinutesSinceMidnight(now: Date = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(now);
    const hour = Number(parts.find((p) => p.type === "hour")?.value ?? NaN);
    const minute = Number(parts.find((p) => p.type === "minute")?.value ?? NaN);
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
      return minutesSinceMidnight(now);
    }
    return hour * 60 + minute;
  } catch {
    return minutesSinceMidnight(now);
  }
}

/**
 * Address/change actions on subscription are allowed from 8:00 AM to 3:00 PM IST
 * (inclusive of 8:00, inclusive through 3:00).
 */
export function isSubscriptionChangeAllowed(now: Date = new Date()) {
  const minutes = getIndiaMinutesSinceMidnight(now);
  return minutes >= 8 * 60 && minutes <= 15 * 60;
}

export function isLunchBookableToday(now: Date = new Date()) {
  return getIndiaMinutesSinceMidnight(now) < LUNCH_CUTOFF_MINUTES;
}

export function isDinnerBookableToday(now: Date = new Date()) {
  return getIndiaMinutesSinceMidnight(now) < DINNER_CUTOFF_MINUTES;
}

export function isTodayBookable(now: Date = new Date()) {
  return isDinnerBookableToday(now);
}

export function getMinBookableDateYmd(now: Date = new Date()) {
  const today = toIndiaYmd(now);
  return isTodayBookable(now) ? today : addDaysYmd(today, 1);
}

/**
 * Subscription start date from selected slots (IST):
 * - Lunch only: before 8:00 AM today, 8:00 AM onward tomorrow
 * - Dinner only: before 3:00 PM today, 3:00 PM onward tomorrow
 * - Lunch + Dinner: before 3:00 PM today, 3:00 PM onward tomorrow
 */
export function getSubscriptionStartDateYmd(
  slots: string[] = [],
  now: Date = new Date(),
) {
  const today = toIndiaYmd(now);
  const tomorrow = addDaysYmd(today, 1);
  const minutes = getIndiaMinutesSinceMidnight(now);
  const ids = slots.map((id) => String(id).toLowerCase());
  const hasLunch = ids.includes("lunch");
  const hasDinner = ids.includes("dinner");
  const afterEight = minutes >= LUNCH_CUTOFF_MINUTES;
  const afterThree = minutes >= DINNER_CUTOFF_MINUTES;

  if (hasLunch && hasDinner) {
    return afterThree ? tomorrow : today;
  }
  if (hasLunch) {
    return afterEight ? tomorrow : today;
  }
  if (hasDinner) {
    return afterThree ? tomorrow : today;
  }
  return afterThree ? tomorrow : today;
}

export function isDateBookable(dateYmd?: string | null, now: Date = new Date()) {
  if (!dateYmd) return false;
  const today = toIndiaYmd(now);
  if (dateYmd < today) return false;
  if (dateYmd > today) return true;
  return isTodayBookable(now);
}

export function isSlotBookableOnDate(
  slotId: string,
  dateYmd?: string | null,
  now: Date = new Date(),
) {
  if (!dateYmd || dateYmd !== toIndiaYmd(now)) return true;
  const id = String(slotId).toLowerCase();
  if (id === "lunch") return isLunchBookableToday(now);
  if (id === "dinner") return isDinnerBookableToday(now);
  return true;
}

export function getDisabledSlotsForDates(
  dateYmds: string[] = [],
  now: Date = new Date(),
) {
  const today = toIndiaYmd(now);
  if (!dateYmds.includes(today)) return [] as string[];

  const disabled: string[] = [];
  if (!isLunchBookableToday(now)) disabled.push("Lunch");
  if (!isDinnerBookableToday(now)) disabled.push("Dinner");
  return disabled;
}

export type TomorrowSlotNotice =
  | "lunchTomorrow"
  | "dinnerTomorrow"
  | "slotsTomorrow";

export function getTomorrowSlotNotice(
  slotIds: string[] = [],
  now: Date = new Date(),
): TomorrowSlotNotice | null {
  const today = toIndiaYmd(now);
  if (getSubscriptionStartDateYmd(slotIds, now) === today) return null;

  const ids = slotIds.map((id) => String(id).toLowerCase());
  const lunch = ids.includes("lunch");
  const dinner = ids.includes("dinner");
  if (lunch && dinner) return "slotsTomorrow";
  if (lunch) return "lunchTomorrow";
  if (dinner) return "dinnerTomorrow";
  return null;
}

export function shouldShowTodayCutoffNotice(now: Date = new Date()) {
  return !isTodayBookable(now);
}

export function includeTodayDate(dates: string[] = [], now: Date = new Date()) {
  const today = toLocalYmd(now);
  const unique = new Set(
    dates.map((value) => normalizeDateYmd(value)).filter(Boolean),
  );
  unique.add(today);
  return Array.from(unique).sort();
}

export function normalizeDateYmd(value?: string | Date | null) {
  if (!value) return "";
  if (value instanceof Date) return toLocalYmd(value);
  const raw = String(value).trim();
  const ymd = raw.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return ymd;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "";
  return toLocalYmd(parsed);
}

export type BookingCutoffError =
  | "todaySlotsUnavailable"
  | "todayLunchUnavailable";

export function getBookingCutoffError(params: {
  dateYmds?: Array<string | Date | null | undefined>;
  slots?: string[];
  now?: Date;
}): BookingCutoffError | null {
  const now = params.now ?? new Date();
  const dates = (params.dateYmds || [])
    .map((value) => normalizeDateYmd(value))
    .filter(Boolean);
  const slots = params.slots || [];

  if (dates.some((date) => !isDateBookable(date, now))) {
    return "todaySlotsUnavailable";
  }

  const disabled = getDisabledSlotsForDates(dates, now);
  if (disabled.includes("Lunch") && slots.includes("Lunch")) {
    return "todayLunchUnavailable";
  }
  if (disabled.includes("Dinner") && slots.includes("Dinner")) {
    return "todaySlotsUnavailable";
  }
  return null;
}
