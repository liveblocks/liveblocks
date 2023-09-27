import cx from "classnames";
import type { ComponentProps } from "react";

import { Loading } from "../../../components/Loading";
import { EmptyState } from "../../components/EmptyState";
import { CustomEventsTree } from "../../components/Tree";
import { useCustomEvents, useStatus } from "../../contexts/CurrentRoom";

export function EventTimeline({ className, ...props }: ComponentProps<"div">) {
  const currentStatus = useStatus();
  const customEvents = useCustomEvents();

  if (
    currentStatus === "connected" ||
    currentStatus === "open" || // Same as "connected", but only sent by old clients (prior to 1.1)
    currentStatus === "reconnecting"
  ) {
    if (customEvents.length > 0) {
      return (
        <div
          className={cx(className, "absolute inset-0 flex h-full flex-col")}
          {...props}
        >
          <CustomEventsTree data={customEvents} />
        </div>
      );
    } else {
      return (
        <EmptyState
          description={
            <>No broadcast events have been received in this room.</>
          }
        />
      );
    }
  } else {
    return <EmptyState visual={<Loading />} />;
  }
}
