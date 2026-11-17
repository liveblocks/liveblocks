"use client";

import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { TimeInput } from "@/components/ui/date-time-input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  formatShortDate,
  formatTime,
  parseDateKey,
  toDateKey,
  type DateKey,
} from "@/lib/dates";

type SchedulePickerProps = {
  date: DateKey;
  time: string;
  onDateChange: (date: DateKey) => void;
  onTimeChange: (time: string) => void;
};

/**
 * When the post goes out. The trigger reads as the date and time; the popover
 * holds a month calendar for the day and a segmented input for the time.
 * Both write straight to the post in the project room, so the calendar
 * behind the dialog moves the card as you pick.
 */
export function SchedulePicker({
  date,
  time,
  onDateChange,
  onTimeChange,
}: SchedulePickerProps) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="soft"
            size="sm"
            className="gap-1.5 text-xs font-normal text-neutral-700 tabular-nums [&_svg]:size-3.5"
            aria-label="Schedule"
          />
        }
      >
        <CalendarIcon className="text-neutral-500" />
        {formatShortDate(parseDateKey(date))}
        <span className="text-neutral-400" aria-hidden>
          ·
        </span>
        {formatTime(time)}
      </PopoverTrigger>
      <PopoverContent align="end" className="p-3" aria-label="Schedule">
        <Calendar
          value={date}
          onValueChange={(value) => {
            if (typeof value === "string") {
              onDateChange(value);
            }
          }}
          today={toDateKey(new Date())}
        />
        <div className="mt-3 flex items-center justify-between gap-3 border-t border-neutral-950/5 pt-3">
          <span className="text-xs text-neutral-500">Time</span>
          {/* Segmented: the value only changes once every segment holds
              something, so a half-typed time never reaches Storage. */}
          <TimeInput
            value={time}
            onValueChange={(next) => {
              if (next) {
                onTimeChange(next);
              }
            }}
            aria-label="Time"
            className="h-7 text-xs"
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
