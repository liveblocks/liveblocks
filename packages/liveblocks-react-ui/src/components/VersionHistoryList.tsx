"use client";

import type { ComponentPropsWithoutRef } from "react";
import React, { Children, forwardRef } from "react";

import { classNames } from "../utils/class-names";

export type VersionHistoryListProps = ComponentPropsWithoutRef<"ol">;

/**
 * Displays versions as a list.
 *
 * @example
 * <VersionHistoryList>
 *   {versions.map((version) => (
 *     <Version key={Version.id} version={version} />
 *   ))}
 * </VersionHistoryList>
 */
export const VersionHistoryList = forwardRef<
  HTMLOListElement,
  VersionHistoryListProps
>(({ children, className, ...props }, forwardedRef) => {
  return (
    <ol
      className={classNames("lb-root lb-inbox-notification-list", className)}
      {...props}
      ref={forwardedRef}
    >
      {Children.map(children, (child, index) => (
        <li key={index} className="lb-inbox-notification-list-item">
          {child}
        </li>
      ))}
    </ol>
  );
});
