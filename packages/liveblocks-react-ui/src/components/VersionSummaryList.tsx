"use client";

import type { ComponentPropsWithoutRef } from "react";
import React, { Children, forwardRef } from "react";

import { classNames } from "../utils/class-names";

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
      className={classNames("lb-root lb-version-summary-list", className)}
      {...props}
      ref={forwardedRef}
    >
      {Children.map(children, (child, index) => (
        <li key={index} className="lb-version-summary-list-item">
          {child}
        </li>
      ))}
    </ol>
  );
});
