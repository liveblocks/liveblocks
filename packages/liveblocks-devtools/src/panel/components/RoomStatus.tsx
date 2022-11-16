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
  const tooltipContent = useMemo(() => {
    return currentStatus ? capitalize(currentStatus) : null;
  }, [currentStatus]);
  const statusContent = useMemo(() => {
    switch (currentStatus) {
      case "open":
        return <Ping className="text-green-500" />;

      case "connecting":
      case "authenticating":
        return <Ping className="text-amber-500" />;

      case "closed":
      case "failed":
        return <Ping className="text-red-500" animate={false} />;

      default:
        return <Ping className="text-gray-500" animate={false} />;
    }
  }, [currentStatus]);

  const content = (
    <div className="flex h-5 w-5 items-center justify-center">
      {statusContent}
    </div>
  );

  return tooltipContent ? (
    <Tooltip content={tooltipContent} sideOffset={1}>
      {content}
    </Tooltip>
  ) : (
    content
  );
}
