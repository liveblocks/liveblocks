import classNames from "classnames";
import {
  forwardRef,
  ReactNode,
  KeyboardEventHandler,
  PointerEventHandler,
  TouchEventHandler,
  FocusEventHandler,
  MouseEventHandler,
} from "react";
import styles from "./Button.module.css";

type Props = {
  children: ReactNode;
  appearance: "ghost" | "secondary" | "primary";
  isSquare?: boolean;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  onKeyDown?: KeyboardEventHandler<HTMLButtonElement>;
  onPointerEnter?: PointerEventHandler<HTMLButtonElement>;
  onPointerLeave?: PointerEventHandler<HTMLButtonElement>;
  onPointerDown?: PointerEventHandler<HTMLButtonElement>;
  onFocus?: FocusEventHandler<HTMLButtonElement>;
  onBlur?: FocusEventHandler<HTMLButtonElement>;
  onTouchStart?: TouchEventHandler<HTMLButtonElement>;
  ariaLabel?: string;
  type?: "submit" | "reset" | "button";
  className?: string;
};

const Button = forwardRef<HTMLButtonElement, Props>(
  (
    {
      children,
      appearance,
      isSquare,
      onClick,
      onKeyDown,
      onPointerEnter,
      onPointerLeave,
      onPointerDown,
      onFocus,
      onBlur,
      onTouchStart,
      ariaLabel,
      type,
      className,
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        className={classNames(
          styles.button,
          {
            [styles.button_ghost]: appearance === "ghost",
            [styles.button_secondary]: appearance === "secondary",
            [styles.button_primary]: appearance === "primary",
            [styles.button_square]: isSquare,
          },
          className
        )}
        onClick={onClick}
        onKeyDown={onKeyDown}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        onFocus={onFocus}
        onBlur={onBlur}
        onPointerDown={onPointerDown}
        onTouchStart={onTouchStart}
        aria-label={ariaLabel}
        type={type}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export default Button;
