"use client";

import { useEffect, useState } from "react";

type LocalTimeProps = {
  date: Date | string | number;
  format?: "date" | "datetime";
};

/**
 * Renders a date in the user's locale, but only *after* mount, so the
 * server-rendered HTML (which uses the server's locale) and the
 * hydrated HTML always agree. During SSR / first paint we render an
 * empty string.
 */
export function LocalTime({ date, format = "datetime" }: LocalTimeProps) {
  const [text, setText] = useState<string>("");

  useEffect(() => {
    const d = new Date(date);
    setText(format === "date" ? d.toLocaleDateString() : d.toLocaleString());
  }, [date, format]);

  return <span suppressHydrationWarning>{text}</span>;
}
