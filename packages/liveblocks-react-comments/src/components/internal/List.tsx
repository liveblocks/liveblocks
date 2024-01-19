import { Slot } from "@radix-ui/react-slot";
import type { ReactNode } from "react";
import React, { forwardRef, useMemo } from "react";

import { useOverrides } from "../../overrides";
import type { ComponentPropsWithSlot } from "../../types";
import { listFormat } from "../../utils/intl";

export interface ListProps extends ComponentPropsWithSlot<"span"> {
  values: ReactNode[];
  formatRemaining?: (amount: number) => string;
  truncate?: number;
  locale?: string;
}

export const List = forwardRef<HTMLSpanElement, ListProps>(
  (
    { values, formatRemaining, truncate, locale, asChild, ...props },
    forwardedRef
  ) => {
    const Component = asChild ? Slot : "span";
    const $ = useOverrides();
    const formatRemainingWithDefault = formatRemaining ?? $.LIST_REMAINING;
    const formattedList = useMemo(() => {
      const elements =
        truncate && truncate < values.length - 1
          ? [
              ...values.slice(0, truncate),
              formatRemainingWithDefault(values.length - truncate),
            ]
          : [...values];
      const placeholders = Array(elements.length).fill(".");
      const parts = listFormat(locale).formatToParts(placeholders);

      return parts.map((part) =>
        part.type === "element" ? elements.shift() : part.value
      );
    }, [formatRemainingWithDefault, locale, truncate, values]);

    return (
      <Component {...props} ref={forwardedRef}>
        {formattedList}
      </Component>
    );
  }
);
