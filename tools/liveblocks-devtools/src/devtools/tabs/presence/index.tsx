import cx from "classnames";
import type { ComponentProps } from "react";

import { Loading } from "../../../components/Loading";
import { EmptyState } from "../../components/EmptyState";
import { PresenceTree } from "../../components/Tree";
import { usePresence, useStatus } from "../../contexts/CurrentRoom";

export function Presence({ className, ...props }: ComponentProps<"div">) {
  const currentStatus = useStatus();
  const presence = usePresence();

  if (
    currentStatus === "connected" ||
    currentStatus === "open" || // Same as "connected", but only sent by old clients (prior to 1.1)
    currentStatus === "reconnecting"
  ) {
    if (presence.length > 0) {
      return (
        <div
          className={cx(className, "absolute inset-0 flex h-full flex-col")}
          {...props}
        >
          <PresenceTree data={presence} />
        </div>
      );
    } else {
      return (
        <EmptyState
          description={
            <>There seems to be no users present in this&nbsp;room.</>
          }
        />
      );
    }
  } else {
    return <EmptyState visual={<Loading />} />;
  }
}
