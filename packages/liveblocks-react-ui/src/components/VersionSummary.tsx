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

export interface VersionSummaryProps
  extends ComponentPropsWithoutRef<"button"> {
  version: HistoryVersion;
  selected?: boolean;
}

/**
 * Displays some information about a version.
 *
 * @example
 * <VersionSummary version={version} />
 */
export const VersionSummary = forwardRef<
  HTMLButtonElement,
  VersionSummaryProps
>(({ version, selected, className, ...props }, forwardedRef) => {
  const $ = useOverrides();

  return (
    <button
      {...props}
      className={classNames("lb-root lb-version-summary", className)}
      ref={forwardedRef}
      data-selected={selected ? "" : undefined}
    >
      <Timestamp
        locale={$.locale}
        date={version.createdAt}
        className="lb-date lb-version-summary-date"
      />
      <span className="lb-version-summary-authors">
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
