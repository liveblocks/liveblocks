import cx from "classnames";
import type { ComponentProps } from "react";

import { Tooltip } from "./Tooltip";

export function ReloadButton({
  className,
  ...props
}: ComponentProps<"button">) {
  return (
    <Tooltip content="Reload" sideOffset={10}>
      <button
        aria-label="Reload"
        className={cx(
          className,
          "text-dark-600 hover:text-dark-0 focus-visible:text-dark-0 dark:text-light-600 dark:hover:text-light-0 dark:focus-visible:text-light-0 flex h-5 w-5 items-center justify-center"
        )}
        {...props}
      >
        <svg
          width="12"
          height="12"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M11 .5V5H6.5" fill="currentColor" />
          <path
            d="M10.5 3.974 9 2.624a4.5 4.5 0 1 0 1 5.485"
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </svg>
      </button>
    </Tooltip>
  );
}
