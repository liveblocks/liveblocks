"use client";

import type { ComponentPropsWithoutRef } from "react";
import React, { Children, forwardRef } from "react";

import { classNames } from "../utils/class-names";

export type HistoryVersionSummaryListProps = ComponentPropsWithoutRef<"ol">;

/**
 * Displays versions summaries as a list.
 *
 * @example
 * <HistoryVersionSummaryList>
 *   {versions.map((version) => (
 *     <HistoryVersionSummary key={version.id} version={version} />
 *   ))}
 * </HistoryVersionSummaryList>
 */
export const HistoryVersionSummaryList = forwardRef<
  HTMLOListElement,
  HistoryVersionSummaryListProps
>(({ children, className, ...props }, forwardedRef) => {
  return (
    <ol
      className={classNames(
        "lb-root lb-history-version-summary-list",
        className
      )}
      {...props}
      ref={forwardedRef}
    >
      {Children.map(children, (child, index) => (
        <li key={index} className="lb-history-version-summary-list-item">
          {child}
        </li>
      ))}
    </ol>
  );
});
