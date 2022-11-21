import cx from "classnames";
import type { ComponentProps } from "react";
import { useMemo } from "react";

import { capitalize } from "../../lib/capitalize";
import { useStatus } from "../contexts/CurrentRoom";
import { Tooltip } from "./Tooltip";

interface PingProps extends ComponentProps<"div"> {
  animate?: boolean;
}

function Ping({ animate = true, className, ...props }: PingProps) {
  return (
    <div
      className={cx(
        className,
        "relative flex h-2 w-2 rounded-full bg-current",
        animate &&
          "before:absolute before:inset-0 before:animate-ping before:rounded-full before:bg-current before:opacity-80"
      )}
      {...props}
    />
  );
}

export function RoomStatus() {
  const currentStatus = useStatus();
  const statusContent = useMemo(() => {
    switch (currentStatus) {
      case "open":
        return <Ping className="text-lime-500 dark:text-lime-400" />;

      case "connecting":
      case "authenticating":
        return <Ping className="text-amber-500 dark:text-amber-400" />;

      case "closed":
      case "failed":
        return (
          <Ping className="text-red-500 dark:text-red-400" animate={false} />
        );

      default:
        return (
          <Ping className="text-dark-900 dark:text-light-900" animate={false} />
        );
    }
  }, [currentStatus]);
  const tooltipContent = useMemo(() => {
    return currentStatus ? (
      <>
        <div className="mr-2">{statusContent}</div>
        <span>{capitalize(currentStatus)}</span>
      </>
    ) : null;
  }, [currentStatus]);

  const content = (
    <div className="flex h-5 w-5 cursor-help items-center justify-center">
      {statusContent}
    </div>
  );

  return tooltipContent ? (
    <Tooltip
      content={tooltipContent}
      sideOffset={10}
      className="flex items-center"
    >
      {content}
    </Tooltip>
  ) : (
    content
  );
}
