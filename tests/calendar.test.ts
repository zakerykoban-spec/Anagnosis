import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import {
  buildGregorianMonth,
  calendarMonthAnchor,
  dateFromLocalIso,
  GREEK_CALENDAR_MONTHS,
  shiftCalendarMonth,
} from '../src/calendar.ts'

test('calendar exposes the required nominative Greek month names', () => {
  assert.deepEqual(
    GREEK_CALENDAR_MONTHS.map((month) => month.greek),
    [
      'Ἰανουάριος',
      'Φεβρουάριος',
      'Μάρτιος',
      'Ἀπρίλιος',
      'Μάιος',
      'Ἰούνιος',
      'Ἰούλιος',
      'Αὔγουστος',
      'Σεπτέμβριος',
      'Ὀκτώβριος',
      'Νοέμβριος',
      'Δεκέμβριος',
    ],
  )
})

test('calendar month browsing crosses year boundaries without changing the source date', () => {
  const sourceDate = new Date(2026, 11, 15)
  const anchor = calendarMonthAnchor(sourceDate)
  const january = shiftCalendarMonth(anchor, 1)
  const november = shiftCalendarMonth(anchor, -1)

  assert.equal(january.getFullYear(), 2027)
  assert.equal(january.getMonth(), 0)
  assert.equal(november.getFullYear(), 2026)
  assert.equal(november.getMonth(), 10)
  assert.equal(sourceDate.getFullYear(), 2026)
  assert.equal(sourceDate.getMonth(), 11)
  assert.equal(sourceDate.getDate(), 15)
})

test('Gregorian February grid handles leap years', () => {
  const leapDays = buildGregorianMonth(
    new Date(2028, 1, 1),
    new Date(2028, 1, 29),
  ).filter((day) => day.inMonth)
  const commonDays = buildGregorianMonth(
    new Date(2027, 1, 1),
    new Date(2027, 1, 28),
  ).filter((day) => day.inMonth)

  assert.equal(leapDays.length, 29)
  assert.equal(leapDays.at(-1)?.day, 29)
  assert.equal(commonDays.length, 28)
  assert.equal(commonDays.at(-1)?.day, 28)
})

test('calendar highlights the real date and parses local ISO dates without UTC drift', () => {
  const today = dateFromLocalIso('2026-08-15')
  assert.ok(today)

  const days = buildGregorianMonth(today, today)
  const highlighted = days.filter((day) => day.isToday)

  assert.equal(highlighted.length, 1)
  assert.equal(highlighted[0]?.iso, '2026-08-15')
  assert.equal(highlighted[0]?.day, 15)
  assert.equal(dateFromLocalIso('2026-02-29'), null)
})

test('calendar enhancement remains informational and preserves the closed date markup', () => {
  const launcher = fs.readFileSync('src/components/CalendarLauncher.tsx', 'utf8')
  const app = fs.readFileSync('src/App.tsx', 'utf8')
  const main = fs.readFileSync('src/main.tsx', 'utf8')

  assert.match(main, /<CalendarLauncher\s*\/>/u)
  assert.match(app, /<time className="calendar-mark" dateTime=\{officeDate\.iso\}>/u)
  assert.match(launcher, /Ἡμερολόγιον/u)
  assert.match(launcher, /Educational Gregorian calendar/u)
  assert.doesNotMatch(
    launcher,
    /setProgress|resolveDailyOffice|markDailySection|localStorage\.setItem/u,
  )
})
