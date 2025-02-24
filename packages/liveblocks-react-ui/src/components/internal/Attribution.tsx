import type { ComponentProps } from "react";

import { classNames } from "../../utils/class-names";

export function Attribution({ className, ...props }: ComponentProps<"a">) {
  return (
    <a
      href="https://liveblocks.io"
      target="_blank"
      rel="noopener noreferrer"
      className={classNames("lb-composer-attribution", className)}
      {...props}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 384 72"
        aria-label="Made with Liveblocks"
      >
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M86 10h-8v50h8V10Zm16 14h-8v36h8V24Zm0-15h-8v9h8V9Zm13 15h-9l12 36h10l13-36h-9l-9 28-8-28Zm44-1c-11 0-18 8-18 19s7 19 18 19c8 0 15-4 17-13h-8c-1 4-5 6-9 6-6 0-9-3-9-10h27c0-10-6-21-18-21Zm0 7c5 0 9 3 9 8h-18c0-5 4-8 9-8Zm42-7c-4 0-8 2-11 6V10h-8v50h8v-5c3 4 7 6 11 6 11 0 16-9 16-19s-5-19-16-19Zm-2 32c-7 0-9-7-9-13s2-13 9-13 9 7 9 13-2 13-9 13Zm32-45h-8v50h8V10Zm24 51c11 0 18-8 18-19s-8-19-18-19c-11 0-19 8-19 19s7 19 19 19Zm0-6c-8 0-10-7-10-13s2-13 10-13c7 0 9 7 9 13s-2 13-9 13Zm39 6c8 0 15-4 17-12l-8-1c-2 4-4 6-9 6-7 0-9-6-9-12s2-12 9-12c5 0 8 3 8 7l9-1c-2-8-9-13-17-13-11 0-18 9-18 19 0 11 7 19 18 19Zm30-14 4-4 10 17h10l-15-23 15-13h-11l-13 13V10h-9v50h9V47Zm39 14c8 0 16-3 16-12 0-8-8-10-15-11-2-1-7-1-7-5 0-3 3-4 6-4 4 0 7 3 7 7l8-1c-1-9-8-12-15-12s-15 3-15 11 9 10 15 11c3 1 8 2 8 5 0 4-4 5-7 5-5 0-8-3-9-7l-8 1c1 8 9 12 16 12ZM41 27H0l12 12v17l29-29ZM20 60h40L48 48V32L20 60Z"
          fill="currentColor"
        />
      </svg>
    </a>
  );
}
