"use client";

import type { ComponentPropsWithoutRef } from "react";
import { Children, forwardRef } from "react";

import { cn } from "../utils/cn";

export type VersionSummaryListProps = ComponentPropsWithoutRef<"ol">;

/**
 * Displays versions summaries as a list.
 *
 * @example
 * <VersionSummaryList>
 *   {versions.map((version) => (
 *     <VersionSummary key={version.id} version={version} />
 *   ))}
 * </VersionSummaryList>
 */
export const VersionSummaryList = forwardRef<
  HTMLOListElement,
  VersionSummaryListProps
>(({ children, className, ...props }, forwardedRef) => {
  return (
    <ol
      className={cn("lb-root lb-history-version-summary-list", className)}
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

/**
 * @deprecated Use {@link VersionSummaryListProps} instead.
 */
export type HistoryVersionSummaryListProps = VersionSummaryListProps;

/**
 * Displays versions summaries as a list.
 *
 * @deprecated Use {@link VersionSummaryList} instead.
 *
 * @example
 * <HistoryVersionSummaryList>
 *   {versions.map((version) => (
 *     <HistoryVersionSummary key={version.id} version={version} />
 *   ))}
 * </HistoryVersionSummaryList>
 */
export const HistoryVersionSummaryList = VersionSummaryList;
