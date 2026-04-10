import { Slot as SlotPrimitive } from "radix-ui";
import type { ReactNode } from "react";
import { forwardRef, useMemo } from "react";

import { useOverrides } from "../../overrides";
import type { ComponentPropsWithSlot } from "../../types";
import { cn } from "../../utils/cn";
import { listFormat } from "../../utils/intl";

export interface ListProps extends ComponentPropsWithSlot<"span"> {
  values: ReactNode[];
  formatRemaining?: (amount: number) => string;
  truncate?: number;
  locale?: string;
}

export const List = forwardRef<HTMLSpanElement, ListProps>(
  (
    { values, formatRemaining, truncate, locale, className, asChild, ...props },
    forwardedRef
  ) => {
    const Component = asChild ? SlotPrimitive.Slot : "span";
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
      <Component
        className={cn("lb-list", className)}
        {...props}
        ref={forwardedRef}
      >
        {formattedList}
      </Component>
    );
  }
);
