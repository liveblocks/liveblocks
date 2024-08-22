
import type { HistoryVersion } from "@liveblocks/core";
import type { ComponentPropsWithRef } from "react";
import React, { forwardRef } from "react";

import { useOverrides } from "../overrides";
import { Timestamp } from "../primitives";
import { classNames } from "../utils/class-names";
import { User } from "./internal/User";

export type VersionHistoryListProps = { version: HistoryVersion, onSelect?: (version: HistoryVersion) => void } & ComponentPropsWithRef<"div">;

export const Version = forwardRef<
  HTMLDivElement,
  VersionHistoryListProps
>(({ className, version, ...props }, forwardedRef) => {
  const $ = useOverrides();
  const { id, authors, createdAt } = version;

  // todo: add props
  return (
    <div
      {...props}
      className={classNames("lb-version-item", className)}
      key={id}
      ref={forwardedRef}
    >
      <p><Timestamp locale={$.locale} date={createdAt} /></p>
      {authors?.length !== 0 && authors.map((a, i) => (
        <span key={a} style={{ fontSize: "0.75rem", color: "#838383" }}>{i !== 0 && ","}<User userId={a} /></span>
      ))}
    </div>
  );
});