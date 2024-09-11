"use client";

import type { HistoryVersion } from "@liveblocks/core";
import type { ComponentPropsWithoutRef } from "react";
import React, { forwardRef } from "react";

import { useOverrides } from "../overrides";
import { Timestamp } from "../primitives";
import { classNames } from "../utils/class-names";
import { List } from "./internal/List";
import { User } from "./internal/User";

const AUTHORS_TRUNCATE = 3;

export interface HistoryVersionSummaryProps
  extends ComponentPropsWithoutRef<"button"> {
  version: HistoryVersion;
  selected?: boolean;
}

/**
 * Displays some information about a version.
 *
 * @example
 * <HistoryVersionSummary version={version} />
 */
export const HistoryVersionSummary = forwardRef<
  HTMLButtonElement,
  HistoryVersionSummaryProps
>(({ version, selected, className, ...props }, forwardedRef) => {
  const $ = useOverrides();

  return (
    <button
      {...props}
      className={classNames("lb-root lb-history-version-summary", className)}
      ref={forwardedRef}
      data-selected={selected ? "" : undefined}
    >
      <Timestamp
        locale={$.locale}
        date={version.createdAt}
        className="lb-date lb-history-version-summary-date"
      />
      <span className="lb-history-version-summary-authors">
        <List
          values={version.authors.map((author) => (
            <User key={author.id} userId={author.id} replaceSelf />
          ))}
          formatRemaining={$.LIST_REMAINING_USERS}
          truncate={AUTHORS_TRUNCATE}
          locale={$.locale}
        />
      </span>
    </button>
  );
});
