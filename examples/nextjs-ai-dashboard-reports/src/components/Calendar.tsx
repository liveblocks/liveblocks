// Tremor Raw Calendar [v0.0.2]

"use client"

import {
  RiArrowLeftDoubleLine,
  RiArrowLeftSLine,
  RiArrowRightDoubleLine,
  RiArrowRightSLine,
} from "@remixicon/react"
import { addYears, format, type Locale } from "date-fns"
import * as React from "react"
import {
  DayPicker,
  useDayPicker,
  type DayButtonProps,
  type Matcher,
  type MonthCaptionProps,
  type PropsBase,
  type PropsRange,
  type PropsSingle,
} from "react-day-picker"

import { cx, focusRing } from "@/lib/utils"

interface NavigationButtonProps
  extends React.HTMLAttributes<HTMLButtonElement> {
  onClick: () => void
  icon: React.ElementType
  disabled?: boolean
}

const NavigationButton = React.forwardRef<
  HTMLButtonElement,
  NavigationButtonProps
>(
  (
    { onClick, icon, disabled, ...props }: NavigationButtonProps,
    forwardedRef,
  ) => {
    const Icon = icon
    return (
      <button
        ref={forwardedRef}
        type="button"
        disabled={disabled}
        className={cx(
          "flex size-8 shrink-0 items-center justify-center rounded-sm border p-1 outline-hidden transition select-none sm:size-[30px]",
          // text color
          "text-neutral-600 hover:text-neutral-800",
          "dark:text-neutral-400 dark:hover:text-neutral-200",
          // border color
          "border-neutral-200 dark:border-neutral-700",
          // background color
          "hover:bg-neutral-50 active:bg-neutral-100",
          "dark:hover:bg-neutral-900 dark:active:bg-neutral-800",
          // disabled
          "disabled:pointer-events-none",
          "disabled:border-neutral-200 dark:disabled:border-neutral-800",
          "disabled:text-neutral-400 dark:disabled:text-neutral-600",
          focusRing,
        )}
        onClick={onClick}
        {...props}
      >
        <Icon className="size-full shrink-0" />
      </button>
    )
  },
)

NavigationButton.displayName = "NavigationButton"

type OmitKeys<T, K extends keyof T> = {
  [P in keyof T as P extends K ? never : P]: T[P]
}

type KeysToOmit = "showWeekNumber" | "captionLayout" | "locale"

type BaseProps = OmitKeys<PropsBase, KeysToOmit> & {
  locale?: Locale
  required?: boolean
}
type SingleProps = BaseProps & OmitKeys<PropsSingle, "mode" | "required">
type RangeProps = BaseProps & OmitKeys<PropsRange, "mode" | "required">

type CalendarProps =
  | ({
      mode: "single"
    } & SingleProps)
  | ({
      mode?: undefined
    } & SingleProps)
  | ({
      mode: "range"
    } & RangeProps)

const CalendarDayButton = ({
  day: _day,
  modifiers,
  className,
  children,
  ...props
}: DayButtonProps) => {
  const buttonRef = React.useRef<HTMLButtonElement>(null)

  React.useEffect(() => {
    if (modifiers.focused) {
      buttonRef.current?.focus()
    }
  }, [modifiers.focused])

  const { selected, today, disabled, outside, range_middle } = modifiers

  return (
    <button
      ref={buttonRef}
      {...props}
      type="button"
      className={cx(
        "relative size-9 rounded-sm text-sm text-neutral-900 dark:text-neutral-50",
        "hover:bg-neutral-200 dark:hover:bg-neutral-700",
        focusRing,
        today && "font-semibold",
        outside && "text-neutral-400 dark:text-neutral-600",
        selected && [
          "rounded-sm",
          "bg-black text-neutral-50",
          "dark:bg-black dark:text-neutral-50",
        ],
        modifiers.range_start && "rounded-l! rounded-r-none",
        modifiers.range_end && "rounded-l-none rounded-r!",
        range_middle && [
          "rounded-none!",
          "bg-neutral-100! text-neutral-900!",
          "dark:bg-neutral-900! dark:text-neutral-50!",
        ],
        disabled &&
          "text-neutral-300! line-through hover:bg-transparent dark:text-neutral-700!",
        className,
      )}
    >
      {children}
      {today && (
        <span
          className={cx(
            "absolute inset-x-1/2 bottom-1.5 h-0.5 w-4 -translate-x-1/2 rounded-[2px]",
            {
              "bg-black dark:bg-white": !selected,
              "bg-white! dark:bg-neutral-950!": selected,
              "bg-neutral-400! dark:bg-neutral-600!": selected && range_middle,
              "bg-neutral-400 text-neutral-400 dark:bg-neutral-400 dark:text-neutral-600":
                disabled,
            },
          )}
        />
      )}
    </button>
  )
}

const Calendar = ({
  weekStartsOn = 1,
  numberOfMonths = 1,
  enableYearNavigation = false,
  disableNavigation,
  locale,
  className,
  classNames,
  required: _required,
  ...props
}: CalendarProps & { enableYearNavigation?: boolean }) => {
  const CalendarMonthCaption = React.useCallback(
    ({ calendarMonth, displayIndex }: MonthCaptionProps) => {
      const { goToMonth, nextMonth, previousMonth, months, dayPickerProps } =
        useDayPicker()
      const { startMonth, endMonth } = dayPickerProps

      const currentMonth = months[0]?.date ?? calendarMonth.date
      const isFirst = displayIndex === 0
      const isLast = displayIndex === months.length - 1

      const hideNextButton = numberOfMonths > 1 && (isFirst || !isLast)
      const hidePreviousButton = numberOfMonths > 1 && (isLast || !isFirst)

      const goToPreviousYear = () => {
        const targetMonth = addYears(currentMonth, -1)
        if (
          previousMonth &&
          (!startMonth || targetMonth.getTime() >= startMonth.getTime())
        ) {
          goToMonth(targetMonth)
        }
      }

      const goToNextYear = () => {
        const targetMonth = addYears(currentMonth, 1)
        if (
          nextMonth &&
          (!endMonth || targetMonth.getTime() <= endMonth.getTime())
        ) {
          goToMonth(targetMonth)
        }
      }

      return (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            {enableYearNavigation && !hidePreviousButton && (
              <NavigationButton
                disabled={
                  disableNavigation ||
                  !previousMonth ||
                  (startMonth &&
                    addYears(currentMonth, -1).getTime() <
                      startMonth.getTime())
                }
                aria-label="Go to previous year"
                onClick={goToPreviousYear}
                icon={RiArrowLeftDoubleLine}
              />
            )}
            {!hidePreviousButton && (
              <NavigationButton
                disabled={disableNavigation || !previousMonth}
                aria-label="Go to previous month"
                onClick={() => previousMonth && goToMonth(previousMonth)}
                icon={RiArrowLeftSLine}
              />
            )}
          </div>

          <div
            role="presentation"
            aria-live="polite"
            className="text-sm font-medium text-neutral-900 capitalize tabular-nums dark:text-neutral-50"
          >
            {format(calendarMonth.date, "LLLL yyy", { locale })}
          </div>

          <div className="flex items-center gap-1">
            {!hideNextButton && (
              <NavigationButton
                disabled={disableNavigation || !nextMonth}
                aria-label="Go to next month"
                onClick={() => nextMonth && goToMonth(nextMonth)}
                icon={RiArrowRightSLine}
              />
            )}
            {enableYearNavigation && !hideNextButton && (
              <NavigationButton
                disabled={
                  disableNavigation ||
                  !nextMonth ||
                  (endMonth &&
                    addYears(currentMonth, 1).getTime() > endMonth.getTime())
                }
                aria-label="Go to next year"
                onClick={goToNextYear}
                icon={RiArrowRightDoubleLine}
              />
            )}
          </div>
        </div>
      )
    },
    [disableNavigation, enableYearNavigation, locale, numberOfMonths],
  )

  const sharedProps = {
    weekStartsOn,
    numberOfMonths,
    locale,
    showOutsideDays: numberOfMonths === 1,
    hideNavigation: true,
    className: cx(className),
    classNames: {
      months: "flex space-y-0",
      month: "space-y-4 p-3",
      month_grid: "w-full border-collapse space-y-1",
      weekday:
        "w-9 font-medium text-sm sm:text-xs text-center text-neutral-400 dark:text-neutral-600 pb-2",
      week: "w-full mt-0.5",
      day: cx(
        "relative p-0 text-center focus-within:relative",
        "text-neutral-900 dark:text-neutral-50",
      ),
      hidden: "invisible",
      ...classNames,
    },
    components: {
      MonthCaption: CalendarMonthCaption,
      DayButton: CalendarDayButton,
    },
    "tremor-id": "tremor-raw",
  }

  if (props.mode === "range") {
    return <DayPicker {...sharedProps} {...props} />
  }

  return <DayPicker {...sharedProps} {...props} mode="single" />
}

Calendar.displayName = "Calendar"

export { Calendar, type Matcher }
