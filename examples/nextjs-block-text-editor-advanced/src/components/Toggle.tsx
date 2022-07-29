import styles from "../../styles/Toggle.module.css";
import * as TogglePrimitive from "@radix-ui/react-toggle";
import { ReactNode } from "react";
import classNames from "classnames";

type Props = {
  defaultPressed?: boolean;
  pressed?: boolean;
  onPressedChange?: (pressed: boolean) => void;
  disabled?: boolean;
  children: ReactNode;
  ariaLabel?: string;
};

export default function Toggle({
  defaultPressed,
  pressed,
  onPressedChange,
  disabled,
  children,
  ariaLabel,
}: Props) {
  return (
    <TogglePrimitive.Root
      className={classNames(styles.toggle, {
        [styles.toggle_pressed]: pressed,
      })}
      aria-label={ariaLabel}
      defaultPressed={defaultPressed}
      pressed={pressed}
      onPressedChange={onPressedChange}
      disabled={disabled}
    >
      {children}
    </TogglePrimitive.Root>
  );
}
