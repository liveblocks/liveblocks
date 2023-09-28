import cx from "classnames";
import type { ComponentProps } from "react";

import { Loading } from "../../../components/Loading";
import { EmptyState } from "../../components/EmptyState";
import { Tooltip } from "../../components/Tooltip";
import { CustomEventsTree } from "../../components/Tree";
import { useCustomEvents, useStatus } from "../../contexts/CurrentRoom";

export function EventTimeline({ className, ...props }: ComponentProps<"div">) {
  const currentStatus = useStatus();
  const [customEvents, clearCustomEvents] = useCustomEvents();

  if (
    currentStatus === "connected" ||
    currentStatus === "open" || // Same as "connected", but only sent by old clients (prior to 1.1)
    currentStatus === "reconnecting"
  ) {
    if (customEvents.length > 0) {
      return (
        <div className={cx(className, "absolute inset-0")} {...props}>
          <div className="absolute inset-0 flex flex-col">
            <CustomEventsTree data={customEvents} />
            <div className="flex-none">
              <button onClick={clearCustomEvents}>Clear</button>
            </div>
            <div className="absolute -bottom-0 left-0 w-full border-light-300 dark:border-dark-300 bg-light-0 dark:bg-dark-0 flex h-8 items-center border-t flex-none px-2.5">
              <Tooltip content="Clear" sideOffset={10}>
                <button
                  onClick={clearCustomEvents}
                  className="ml-auto -mr-1.5 disabled:opacity-50 p-1.5 text-dark-600 hover:enabled:text-dark-0 focus-visible:enabled:text-dark-0 dark:text-light-600 dark:hover:enabled:text-light-0 dark:focus-visible:enabled:text-light-0"
                  aria-label="Clear"
                >
                  <svg
                    width="16"
                    height="16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M3 5.5h10m-1.5 0V12a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1V5.5M6 4.75V4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v.75"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </Tooltip>
            </div>
          </div>
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
