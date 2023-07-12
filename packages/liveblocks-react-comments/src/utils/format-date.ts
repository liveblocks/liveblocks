const formatter = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
});

/**
 * Format a date absolutely.
 */
export function formatDate(date: Date) {
  return formatter.format(date);
}

const relativeFormatter = new Intl.RelativeTimeFormat(undefined, {
  numeric: "auto",
});

const relativeUnits = {
  seconds: 60,
  minutes: 60,
  hours: 24,
  days: 7,
  weeks: 4.34524,
  months: 12,
};

/**
 * Format a date relatively.
 */
export function formatDateRelative(date: Date) {
  let difference = (date.getTime() - Date.now()) / 1000;

  if (
    difference > -relativeUnits.seconds &&
    difference < relativeUnits.seconds
  ) {
    return relativeFormatter.format(0, "seconds");
  }

  for (const [unit, length] of Object.entries(relativeUnits)) {
    if (Math.abs(difference) < length) {
      return relativeFormatter.format(
        Math.round(difference),
        unit as Intl.RelativeTimeFormatUnit
      );
    }

    difference /= length;
  }

  return relativeFormatter.format(Math.round(difference), "years");
}
