import cx from "classnames";
import { ComponentProps, ReactNode } from "react";

type Props = {
  children: ReactNode;
  size: "md" | "lg";
} & ComponentProps<"button">;

export function CircularButton(props: Props) {
  return (
    <button
      className={cx(
        "group rounded-full shrink-0 flex items-center justify-center transition-opacity duration-150 ease-out disabled:pointer-events-none bg-inverse disabled:bg-quaternary",
        {
          ["size-10"]: props.size === "md",
          ["size-12 sm:size-14"]: props.size === "lg",
        }
      )}
      {...props}
    >
      {props.children}
    </button>
  );
}
