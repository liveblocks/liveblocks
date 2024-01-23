import cx from "classnames";
import { ComponentProps, ReactNode } from "react";

type Props = {
  children: ReactNode;
  appearance: "primary" | "secondary";
  size: "md" | "lg";
} & ComponentProps<"button">;

export function CircularButton(props: Props) {
  return (
    <button
      className={cx(
        "group rounded-full shrink-0 flex items-center justify-center transition-opacity duration-150 ease-out disabled:pointer-events-none",
        {
          ["bg-inverse hover:bg-inverse/90 disabled:opacity-50"]:
            props.appearance === "primary",
          ["border border-neutral-200"]: props.appearance === "secondary",
          ["size-9"]: props.size === "md",
          ["size-12"]: props.size === "lg",
        }
      )}
      {...props}
      data-type={props.appearance}
    >
      {props.children}
    </button>
  );
}
