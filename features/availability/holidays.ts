// Philippine holidays and the templates shops start from. Browser-safe: the
// holiday editor and the slot engine both use it.
//
// Fixed and Easter-based dates are computed for any year. Chinese New Year and
// the two Eid holidays move every year and are set by proclamation, so they
// only apply in years listed in `dates`. Add next year's dates (and any date a
// proclamation moves) when Malacañang publishes the holiday list, usually in
// the second half of the year before.

export type HolidayKind = "regular" | "special" | "observance";

export const HOLIDAY_KIND_LABELS: Record<HolidayKind, string> = {
  regular: "Regular holiday",
  special: "Special non-working day",
  observance: "Often observed",
};

type DateRule =
  | { type: "fixed"; month: number; day: number }
  | { type: "easter"; offsetDays: number }
  | { type: "last_weekday"; month: number; weekday: number }
  | { type: "proclaimed" };

export type HolidayDefinition = {
  key: string;
  name: string;
  kind: HolidayKind;
  rule: DateRule;
  /** "MM-dd" by year. Overrides the rule (for a moved holiday) or, for proclaimed holidays, is the only source. */
  dates?: Readonly<Record<number, string>>;
  /** Set by proclamation each year, so the date shown is the best estimate until then. */
  movable?: boolean;
};

export const HOLIDAYS: readonly HolidayDefinition[] = [
  {
    key: "new_years_day",
    name: "New Year's Day",
    kind: "regular",
    rule: { type: "fixed", month: 1, day: 1 },
  },
  {
    key: "chinese_new_year",
    name: "Chinese New Year",
    kind: "special",
    rule: { type: "proclaimed" },
    dates: { 2026: "02-17", 2027: "02-06", 2028: "01-26" },
  },
  {
    key: "maundy_thursday",
    name: "Maundy Thursday",
    kind: "regular",
    rule: { type: "easter", offsetDays: -3 },
  },
  {
    key: "good_friday",
    name: "Good Friday",
    kind: "regular",
    rule: { type: "easter", offsetDays: -2 },
  },
  {
    key: "black_saturday",
    name: "Black Saturday",
    kind: "special",
    rule: { type: "easter", offsetDays: -1 },
  },
  {
    key: "easter_sunday",
    name: "Easter Sunday",
    kind: "observance",
    rule: { type: "easter", offsetDays: 0 },
  },
  {
    key: "araw_ng_kagitingan",
    name: "Araw ng Kagitingan",
    kind: "regular",
    rule: { type: "fixed", month: 4, day: 9 },
  },
  {
    key: "eid_al_fitr",
    name: "Eid'l Fitr",
    kind: "regular",
    rule: { type: "proclaimed" },
    dates: { 2026: "03-20", 2027: "03-10", 2028: "02-27" },
    movable: true,
  },
  {
    key: "labor_day",
    name: "Labor Day",
    kind: "regular",
    rule: { type: "fixed", month: 5, day: 1 },
  },
  {
    key: "eid_al_adha",
    name: "Eid'l Adha",
    kind: "regular",
    rule: { type: "proclaimed" },
    dates: { 2026: "05-27", 2027: "05-17", 2028: "05-05" },
    movable: true,
  },
  {
    key: "independence_day",
    name: "Independence Day",
    kind: "regular",
    rule: { type: "fixed", month: 6, day: 12 },
  },
  {
    key: "ninoy_aquino_day",
    name: "Ninoy Aquino Day",
    kind: "special",
    rule: { type: "fixed", month: 8, day: 21 },
  },
  {
    key: "national_heroes_day",
    name: "National Heroes Day",
    kind: "regular",
    // The last Monday of August.
    rule: { type: "last_weekday", month: 8, weekday: 1 },
  },
  {
    key: "all_saints_eve",
    name: "All Saints' Day Eve",
    kind: "observance",
    rule: { type: "fixed", month: 10, day: 31 },
  },
  {
    key: "all_saints_day",
    name: "All Saints' Day",
    kind: "special",
    rule: { type: "fixed", month: 11, day: 1 },
  },
  {
    key: "all_souls_day",
    name: "All Souls' Day",
    kind: "observance",
    rule: { type: "fixed", month: 11, day: 2 },
  },
  {
    key: "bonifacio_day",
    name: "Bonifacio Day",
    kind: "regular",
    rule: { type: "fixed", month: 11, day: 30 },
  },
  {
    key: "immaculate_conception",
    name: "Feast of the Immaculate Conception",
    kind: "special",
    rule: { type: "fixed", month: 12, day: 8 },
  },
  {
    key: "christmas_eve",
    name: "Christmas Eve",
    kind: "special",
    rule: { type: "fixed", month: 12, day: 24 },
  },
  {
    key: "christmas_day",
    name: "Christmas Day",
    kind: "regular",
    rule: { type: "fixed", month: 12, day: 25 },
  },
  {
    key: "rizal_day",
    name: "Rizal Day",
    kind: "regular",
    rule: { type: "fixed", month: 12, day: 30 },
  },
  {
    key: "new_years_eve",
    name: "Last Day of the Year",
    kind: "special",
    rule: { type: "fixed", month: 12, day: 31 },
  },
];

export const HOLIDAY_KEYS = HOLIDAYS.map((holiday) => holiday.key);

const BY_KEY = new Map(HOLIDAYS.map((holiday) => [holiday.key, holiday]));

export function getHoliday(key: string): HolidayDefinition | undefined {
  return BY_KEY.get(key);
}

// Calendar arithmetic on dates alone. Date.UTC keeps it independent of the
// machine's time zone; no instants are involved.
const pad = (value: number) => String(value).padStart(2, "0");
const isoDate = (year: number, month: number, day: number) => {
  const date = new Date(Date.UTC(year, month - 1, day));
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
};

/** Western (Gregorian) Easter Sunday, by the anonymous Gregorian algorithm. */
export function easterSunday(year: number): string {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return isoDate(year, month, day);
}

/** The holiday's date in a year as "yyyy-MM-dd", or null when it isn't known yet. */
export function holidayDate(holiday: HolidayDefinition, year: number): string | null {
  const override = holiday.dates?.[year];
  if (override) return `${year}-${override}`;

  const { rule } = holiday;
  switch (rule.type) {
    case "fixed":
      return isoDate(year, rule.month, rule.day);
    case "easter": {
      const [, month, day] = easterSunday(year).split("-").map(Number);
      return isoDate(year, month!, day! + rule.offsetDays);
    }
    case "last_weekday": {
      const lastDay = new Date(Date.UTC(year, rule.month, 0));
      const back = (lastDay.getUTCDay() - rule.weekday + 7) % 7;
      return isoDate(year, rule.month, lastDay.getUTCDate() - back);
    }
    case "proclaimed":
      return null;
  }
}

export type DatedHoliday = HolidayDefinition & { date: string };

/** Every holiday with a known date in the year, in date order. */
export function holidaysInYear(year: number): DatedHoliday[] {
  return HOLIDAYS.flatMap((holiday) => {
    const date = holidayDate(holiday, year);
    return date ? [{ ...holiday, date }] : [];
  }).sort((a, b) => a.date.localeCompare(b.date));
}

/** The holidays that fall on a calendar date ("yyyy-MM-dd"). */
export function holidaysOn(date: string): HolidayDefinition[] {
  const year = Number(date.slice(0, 4));
  return HOLIDAYS.filter((holiday) => holidayDate(holiday, year) === date);
}

/** The next date (on or after `fromDate`) for each holiday, looking up to a year ahead. */
export function upcomingHolidays(
  fromDate: string,
): Array<DatedHoliday | (HolidayDefinition & { date: null })> {
  const year = Number(fromDate.slice(0, 4));
  return HOLIDAYS.map((holiday) => {
    for (const candidateYear of [year, year + 1]) {
      const date = holidayDate(holiday, candidateYear);
      if (date && date >= fromDate) return { ...holiday, date };
    }
    return { ...holiday, date: null };
  });
}

export type HolidayTemplate = {
  id: string;
  label: string;
  description: string;
  /** Holidays the template closes the shop on. Every other holiday keeps normal hours. */
  closedOn: readonly string[];
};

const keysOfKind = (...kinds: HolidayKind[]) =>
  HOLIDAYS.filter((holiday) => kinds.includes(holiday.kind)).map((holiday) => holiday.key);

export const HOLIDAY_TEMPLATES: readonly HolidayTemplate[] = [
  {
    id: "regular",
    label: "Regular holidays",
    description: "Closed on the 12 regular holidays; open on special days.",
    closedOn: keysOfKind("regular"),
  },
  {
    id: "regular_and_special",
    label: "All declared holidays",
    description: "Closed on regular holidays and special non-working days.",
    closedOn: keysOfKind("regular", "special"),
  },
  {
    id: "big_days",
    label: "Holy Week and Christmas",
    description: "Closed Maundy Thursday to Black Saturday, Christmas and New Year's Day.",
    closedOn: [
      "maundy_thursday",
      "good_friday",
      "black_saturday",
      "christmas_day",
      "new_years_day",
    ],
  },
  {
    id: "open",
    label: "Open on holidays",
    description: "Normal hours every day, holidays included.",
    closedOn: [],
  },
];
