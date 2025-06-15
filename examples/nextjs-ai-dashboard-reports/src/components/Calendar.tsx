// Tremor Raw Calendar [v0.0.2]

"use client"

import {
  RiArrowLeftDoubleLine,
  RiArrowLeftSLine,
  RiArrowRightDoubleLine,
  RiArrowRightSLine,
} from "@remixicon/react"
import { addYears, format, isSameMonth } from "date-fns"
import * as React from "react"
import {
  DayPicker,
  useDayPicker,
  useDayRender,
  useNavigation,
  type DayPickerRangeProps,
  type DayPickerSingleProps,
  type DayProps,
  type Matcher,
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

type KeysToOmit = "showWeekNumber" | "captionLayout" | "mode"

type SingleProps = OmitKeys<DayPickerSingleProps, KeysToOmit>
type RangeProps = OmitKeys<DayPickerRangeProps, KeysToOmit>

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

const Calendar = ({
  mode = "single",
  weekStartsOn = 1,
  numberOfMonths = 1,
  enableYearNavigation = false,
  disableNavigation,
  locale,
  className,
  classNames,
  ...props
}: CalendarProps & { enableYearNavigation?: boolean }) => {
  return (
    <DayPicker
      mode={mode}
      weekStartsOn={weekStartsOn}
      numberOfMonths={numberOfMonths}
      locale={locale}
      showOutsideDays={numberOfMonths === 1 ? true : false}
      className={cx(className)}
      classNames={{
        months: "flex space-y-0",
        month: "space-y-4 p-3",
        nav: "gap-1 flex items-center rounded-full size-full justify-between p-4",
        table: "w-full border-collapse space-y-1",
        head_cell:
          "w-9 font-medium text-sm sm:text-xs text-center text-neutral-400 dark:text-neutral-600 pb-2",
        row: "w-full mt-0.5",
        cell: cx(
          "relative p-0 text-center focus-within:relative",
          "text-neutral-900 dark:text-neutral-50",
        ),
        day: cx(
          "size-9 rounded-sm text-sm text-neutral-900 dark:text-neutral-50",
          "hover:bg-neutral-200 dark:hover:bg-neutral-700",
          focusRing,
        ),
        day_today: "font-semibold",
        day_selected: cx(
          "rounded-sm",
          "aria-selected:bg-black aria-selected:text-neutral-50",
          "dark:aria-selected:bg-black dark:aria-selected:text-neutral-50",
        ),
        day_disabled:
          "text-neutral-300! dark:text-neutral-700! line-through disabled:hover:bg-transparent",
        day_outside: "text-neutral-400 dark:text-neutral-600",
        day_range_middle: cx(
          "rounded-none!",
          "aria-selected:bg-neutral-100! aria-selected:text-neutral-900!",
          "dark:aria-selected:bg-neutral-900! dark:aria-selected:text-neutral-50!",
        ),
        day_range_start: "rounded-r-none rounded-l!",
        day_range_end: "rounded-l-none rounded-r!",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: () => (
          <RiArrowLeftSLine aria-hidden="true" className="size-4" />
        ),
        IconRight: () => (
          <RiArrowRightSLine aria-hidden="true" className="size-4" />
        ),
        Caption: ({ ...props }) => {
          const {
            goToMonth,
            nextMonth,
            previousMonth,
            currentMonth,
            displayMonths,
          } = useNavigation()
          const { numberOfMonths, fromDate, toDate } = useDayPicker()

          const displayIndex = displayMonths.findIndex((month) =>
            isSameMonth(props.displayMonth, month),
          )
          const isFirst = displayIndex === 0
          const isLast = displayIndex === displayMonths.length - 1

          const hideNextButton = numberOfMonths > 1 && (isFirst || !isLast)
          const hidePreviousButton = numberOfMonths > 1 && (isLast || !isFirst)

          const goToPreviousYear = () => {
            const targetMonth = addYears(currentMonth, -1)
            if (
              previousMonth &&
              (!fromDate || targetMonth.getTime() >= fromDate.getTime())
            ) {
              goToMonth(targetMonth)
            }
          }

          const goToNextYear = () => {
            const targetMonth = addYears(currentMonth, 1)
            if (
              nextMonth &&
              (!toDate || targetMonth.getTime() <= toDate.getTime())
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
                      (fromDate &&
                        addYears(currentMonth, -1).getTime() <
                          fromDate.getTime())
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
                {format(props.displayMonth, "LLLL yyy", { locale })}
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
                      (toDate &&
                        addYears(currentMonth, 1).getTime() > toDate.getTime())
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
        Day: ({ date, displayMonth }: DayProps) => {
          const buttonRef = React.useRef<HTMLButtonElement>(null)
          const { activeModifiers, buttonProps, divProps, isButton, isHidden } =
            useDayRender(date, displayMonth, buttonRef)

          const { selected, today, disabled, range_middle } = activeModifiers

          if (isHidden) {
            return <></>
          }

          if (!isButton) {
            return (
              <div
                {...divProps}
                className={cx(
                  "flex items-center justify-center",
                  divProps.className,
                )}
              />
            )
          }

          const {
            children: buttonChildren,
            className: buttonClassName,
            ...buttonPropsRest
          } = buttonProps

          return (
            <button
              ref={buttonRef}
              {...buttonPropsRest}
              type="button"
              className={cx("relative", buttonClassName)}
            >
              {buttonChildren}
              {today && (
                <span
                  className={cx(
                    "absolute inset-x-1/2 bottom-1.5 h-0.5 w-4 -translate-x-1/2 rounded-[2px]",
                    {
                      "bg-black dark:bg-white": !selected,
                      "bg-white! dark:bg-neutral-950!": selected,
                      "bg-neutral-400! dark:bg-neutral-600!":
                        selected && range_middle,
                      "bg-neutral-400 text-neutral-400 dark:bg-neutral-400 dark:text-neutral-600":
                        disabled,
                    },
                  )}
                />
              )}
            </button>
          )
        },
      }}
      tremor-id="tremor-raw"
      {...(props as SingleProps & RangeProps)}
    />
  )
}

Calendar.displayName = "Calendar"

export { Calendar, type Matcher }
