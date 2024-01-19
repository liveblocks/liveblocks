"use client";

import clsx from "clsx";
import { ComponentProps } from "react";
import styles from "./Button.module.css";

export function Button({
  variant = "primary",
  square,
  ...props
}: ComponentProps<"button"> & {
  variant?: "primary" | "secondary" | "tertiary" | "ghost";
  square?: boolean;
}) {
  return (
    <button
      className={clsx(styles.button, {
        [styles.square]: square,
        [styles.primary]: variant === "primary",
        [styles.secondary]: variant === "secondary",
        [styles.tertiary]: variant === "tertiary",
        [styles.ghost]: variant === "ghost",
      })}
      {...props}
    />
  );
}
