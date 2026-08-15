import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  buildGregorianMonth,
  calendarMonthAnchor,
  dateFromLocalIso,
  GREEK_CALENDAR_MONTHS,
  GREEK_CALENDAR_WEEKDAYS,
  shiftCalendarMonth,
} from '../calendar'

const CALENDAR_TRIGGER_SELECTOR = '.calendar-mark'

function asCalendarTrigger(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof Element)) return null
  return target.closest(CALENDAR_TRIGGER_SELECTOR) as HTMLElement | null
}

export function CalendarLauncher() {
  const [open, setOpen] = useState(false)
  const [today, setToday] = useState<Date | null>(null)
  const [visibleMonth, setVisibleMonth] = useState<Date | null>(null)
  const [showGloss, setShowGloss] = useState(true)
  const [monthPickerOpen, setMonthPickerOpen] = useState(false)
  const triggerRef = useRef<HTMLElement | null>(null)
  const closeRef = useRef<HTMLButtonElement | null>(null)

  const enhanceTrigger = useCallback(() => {
    const trigger = document.querySelector<HTMLElement>(CALENDAR_TRIGGER_SELECTOR)
    if (!trigger) return

    trigger.setAttribute('role', 'button')
    trigger.setAttribute('tabindex', '0')
    trigger.setAttribute('aria-haspopup', 'dialog')
    trigger.setAttribute('aria-expanded', open ? 'true' : 'false')
    trigger.setAttribute('aria-label', 'Ἡμερολόγιον · Calendar')
  }, [open])

  const openCalendar = useCallback((trigger: HTMLElement) => {
    const currentDate = dateFromLocalIso(trigger.getAttribute('datetime') ?? '')
    if (!currentDate) return

    triggerRef.current = trigger
    trigger.setAttribute('aria-expanded', 'true')
    setToday(currentDate)
    setVisibleMonth(calendarMonthAnchor(currentDate))
    setShowGloss(Boolean(trigger.querySelector('.calendar-copy small')))
    setMonthPickerOpen(false)
    setOpen(true)
  }, [])

  const closeCalendar = useCallback(() => {
    const trigger = triggerRef.current
    trigger?.setAttribute('aria-expanded', 'false')
    setOpen(false)
    setMonthPickerOpen(false)
    requestAnimationFrame(() => trigger?.focus())
  }, [])

  useEffect(() => {
    enhanceTrigger()
    const root = document.getElementById('root')
    if (!root) return

    const observer = new MutationObserver(enhanceTrigger)
    observer.observe(root, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [enhanceTrigger])

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const trigger = asCalendarTrigger(event.target)
      if (!trigger) return
      event.preventDefault()
      openCalendar(trigger)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' && event.key !== ' ') return
      const trigger = asCalendarTrigger(event.target)
      if (!trigger) return
      event.preventDefault()
      openCalendar(trigger)
    }

    document.addEventListener('click', onClick)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('click', onClick)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [openCalendar])

  useEffect(() => {
    if (!open) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeCalendar()
        return
      }
      if (event.key !== 'Tab') return

      const dialog = document.querySelector<HTMLElement>('.calendar-dialog')
      const focusable = dialog
        ? [...dialog.querySelectorAll<HTMLElement>('button:not(:disabled)')]
        : []
      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [closeCalendar, open])

  const calendarDays = useMemo(
    () => visibleMonth && today
      ? buildGregorianMonth(visibleMonth, today)
      : [],
    [today, visibleMonth],
  )

  if (!open || !today || !visibleMonth) return null

  const visibleMonthIndex = visibleMonth.getMonth()
  const visibleYear = visibleMonth.getFullYear()
  const monthLabel = GREEK_CALENDAR_MONTHS[visibleMonthIndex]

  return <div
    className="calendar-backdrop"
    role="presentation"
    onPointerDown={(event) => {
      if (event.target === event.currentTarget) closeCalendar()
    }}
  >
    <section
      className="calendar-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="calendar-dialog-title"
    >
      <header className="calendar-dialog-header">
        <h2 id="calendar-dialog-title">
          <span>Ἡμερολόγιον</span>
          {showGloss && <small>Calendar</small>}
        </h2>
        <button
          ref={closeRef}
          className="calendar-close"
          type="button"
          aria-label="Close calendar"
          onClick={closeCalendar}
        >×</button>
      </header>

      <p className="calendar-learning-note">
        <span>Γρηγοριανὸν ἡμερολόγιον πρὸς μάθησιν τῶν ὀνομάτων.</span>
        {showGloss && <small>Educational Gregorian calendar; not a reconstruction of a universal ancient calendar.</small>}
      </p>

      <div className="calendar-month-controls">
        <button
          className="calendar-month-arrow"
          type="button"
          aria-label="Previous month"
          onClick={() => setVisibleMonth((current) => current
            ? shiftCalendarMonth(current, -1)
            : current)}
        >‹</button>
        <button
          className="calendar-month-heading"
          type="button"
          aria-expanded={monthPickerOpen}
          aria-controls="calendar-month-picker"
          onClick={() => setMonthPickerOpen((current) => !current)}
        >
          <strong>{monthLabel.greek}</strong>
          <span>{visibleYear}</span>
          {showGloss && <small>{monthLabel.english}</small>}
        </button>
        <button
          className="calendar-month-arrow"
          type="button"
          aria-label="Next month"
          onClick={() => setVisibleMonth((current) => current
            ? shiftCalendarMonth(current, 1)
            : current)}
        >›</button>
      </div>

      {monthPickerOpen
        ? <div className="calendar-month-picker" id="calendar-month-picker" aria-label="Greek month names">
          {GREEK_CALENDAR_MONTHS.map((month, monthIndex) => <button
            key={month.greek}
            type="button"
            className={monthIndex === visibleMonthIndex ? 'is-selected' : undefined}
            aria-pressed={monthIndex === visibleMonthIndex}
            onClick={() => {
              setVisibleMonth(new Date(visibleYear, monthIndex, 1))
              setMonthPickerOpen(false)
            }}
          >
            <span>{month.greek}</span>
            {showGloss && <small>{month.english}</small>}
          </button>)}
        </div>
        : <>
          <div className="calendar-weekdays" role="row">
            {GREEK_CALENDAR_WEEKDAYS.map((weekday) => <div
              key={weekday.greek}
              role="columnheader"
              title={showGloss ? `${weekday.greekLong} · ${weekday.englishLong}` : weekday.greekLong}
            >
              <strong>{weekday.greek}</strong>
              {showGloss && <small>{weekday.english}</small>}
            </div>)}
          </div>
          <div className="calendar-days" role="grid" aria-label={`${monthLabel.greek} ${visibleYear}`}>
            {calendarDays.map((day) => <div
              key={day.iso}
              className={[
                'calendar-day-cell',
                day.inMonth ? '' : 'is-outside',
                day.isToday ? 'is-today' : '',
              ].filter(Boolean).join(' ')}
              role="gridcell"
              aria-current={day.isToday ? 'date' : undefined}
            >
              <time dateTime={day.iso}>{day.day}</time>
            </div>)}
          </div>
        </>}

      <p className="calendar-information-note">
        <span>Ἡ πλοήγησις μόνον πληροφοριακή.</span>
        {showGloss && <small>Browsing does not change today, daily readings, prayers, completion, or progress.</small>}
      </p>
    </section>
  </div>
}
