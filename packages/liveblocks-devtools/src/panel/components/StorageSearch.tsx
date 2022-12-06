import cx from "classnames";
import type { ComponentProps } from "react";

interface Props extends Omit<ComponentProps<"div">, "onChange"> {
  value: ComponentProps<"input">["value"];
  onChange: ComponentProps<"input">["onChange"];
}

export function StorageSearch({ value, onChange, className, ...props }: Props) {
  return (
    <div
      className={cx(className, "relative flex h-full items-center")}
      {...props}
    >
      <input
        type="search"
        value={value}
        onChange={onChange}
        placeholder="Search storage…"
        className="text-dark-0 dark:text-light-0 placeholder:text-dark-600 dark:placeholder:text-light-600 absolute inset-0 h-full w-full bg-transparent pl-7 pt-px pr-2.5 text-xs placeholder:opacity-50"
      />
      <svg
        width="14"
        height="14"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="pointer-events-none absolute left-2 opacity-50"
      >
        <path
          d="M6.5 11a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="m12.5 12.5-3-3"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
