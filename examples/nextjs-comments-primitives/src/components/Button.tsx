import clsx from "clsx";
import { ComponentProps } from "react";

export function Button({ className, ...props }: ComponentProps<"button">) {
  return (
    <button
      className={clsx(
        className,
        "flex h-9 items-center rounded-md bg-blue-500 px-4 text-sm font-semibold text-white outline-none ring-blue-300 ring-offset-2 focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50"
      )}
      {...props}
    />
  );
}
