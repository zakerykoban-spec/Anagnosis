export const GREEK_CALENDAR_MONTHS = [
  { greek: 'Ἰανουάριος', english: 'January' },
  { greek: 'Φεβρουάριος', english: 'February' },
  { greek: 'Μάρτιος', english: 'March' },
  { greek: 'Ἀπρίλιος', english: 'April' },
  { greek: 'Μάιος', english: 'May' },
  { greek: 'Ἰούνιος', english: 'June' },
  { greek: 'Ἰούλιος', english: 'July' },
  { greek: 'Αὔγουστος', english: 'August' },
  { greek: 'Σεπτέμβριος', english: 'September' },
  { greek: 'Ὀκτώβριος', english: 'October' },
  { greek: 'Νοέμβριος', english: 'November' },
  { greek: 'Δεκέμβριος', english: 'December' },
] as const

export const GREEK_CALENDAR_WEEKDAYS = [
  { greek: 'Κυρ', greekLong: 'Κυριακή', english: 'Sun', englishLong: 'Sunday' },
  { greek: 'Δευ', greekLong: 'Δευτέρα', english: 'Mon', englishLong: 'Monday' },
  { greek: 'Τρι', greekLong: 'Τρίτη', english: 'Tue', englishLong: 'Tuesday' },
  { greek: 'Τετ', greekLong: 'Τετάρτη', english: 'Wed', englishLong: 'Wednesday' },
  { greek: 'Πεμ', greekLong: 'Πέμπτη', english: 'Thu', englishLong: 'Thursday' },
  { greek: 'Παρ', greekLong: 'Παρασκευή', english: 'Fri', englishLong: 'Friday' },
  { greek: 'Σαβ', greekLong: 'Σάββατον', english: 'Sat', englishLong: 'Saturday' },
] as const

export type GregorianCalendarDay = {
  iso: string
  day: number
  inMonth: boolean
  isToday: boolean
}

export function localIsoDate(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

export function dateFromLocalIso(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value)
  if (!match) return null

  const year = Number(match[1])
  const monthIndex = Number(match[2]) - 1
  const day = Number(match[3])
  const date = new Date(year, monthIndex, day)

  if (
    date.getFullYear() !== year
    || date.getMonth() !== monthIndex
    || date.getDate() !== day
  ) return null

  return date
}

export function calendarMonthAnchor(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function shiftCalendarMonth(anchor: Date, offset: number): Date {
  return new Date(anchor.getFullYear(), anchor.getMonth() + offset, 1)
}

export function buildGregorianMonth(
  anchor: Date,
  today: Date,
): GregorianCalendarDay[] {
  const month = calendarMonthAnchor(anchor)
  const gridStart = new Date(
    month.getFullYear(),
    month.getMonth(),
    1 - month.getDay(),
  )
  const todayIso = localIsoDate(today)

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(
      gridStart.getFullYear(),
      gridStart.getMonth(),
      gridStart.getDate() + index,
    )
    const iso = localIsoDate(date)

    return {
      iso,
      day: date.getDate(),
      inMonth:
        date.getFullYear() === month.getFullYear()
        && date.getMonth() === month.getMonth(),
      isToday: iso === todayIso,
    }
  })
}
