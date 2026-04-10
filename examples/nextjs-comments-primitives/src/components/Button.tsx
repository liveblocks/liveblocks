import clsx from "clsx";
import { ComponentProps } from "react";

interface SharedProps {
  variant?: "primary" | "secondary" | "ghost" | "destructive";
}

type ButtonProps = SharedProps & ComponentProps<"button">;

type LinkButtonProps = SharedProps & ComponentProps<"a">;

function buttonClassNames(variant: ButtonProps["variant"]) {
  return [
    "flex h-9 items-center justify-center rounded-md px-4 text-sm font-semibold outline-hidden ring-offset-2 focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50",
    {
      "bg-blue-500 text-white ring-blue-300 enabled:hover:bg-blue-400 enabled:focus:bg-blue-400":
        variant === "primary",
      "bg-gray-100 text-gray-600 ring-gray-500 enabled:hover:bg-gray-200 enabled:focus:bg-gray-200":
        variant === "secondary",
      "text-gray-500 ring-gray-500 enabled:hover:bg-gray-100 enabled:focus:bg-gray-100":
        variant === "ghost",
      "bg-red-500 text-white ring-red-300 enabled:hover:bg-red-400 enabled:focus:bg-red-400":
        variant === "destructive",
    },
  ];
}

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonProps) {
  return (
    <button className={clsx(className, buttonClassNames(variant))} {...props} />
  );
}

export function LinkButton({
  variant = "primary",
  className,
  ...props
}: LinkButtonProps) {
  return (
    <a className={clsx(className, buttonClassNames(variant))} {...props} />
  );
}
