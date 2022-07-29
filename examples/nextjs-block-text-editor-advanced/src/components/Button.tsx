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
import styles from "../../styles/Button.module.css";

type Props = {
  children: ReactNode;
  type: "ghost" | "secondary" | "primary";
  onClick?: MouseEventHandler<HTMLButtonElement>;
  onKeyDown?: KeyboardEventHandler<HTMLButtonElement>;
  onPointerEnter?: PointerEventHandler<HTMLButtonElement>;
  onPointerLeave?: PointerEventHandler<HTMLButtonElement>;
  onPointerDown?: PointerEventHandler<HTMLButtonElement>;
  onFocus?: FocusEventHandler<HTMLButtonElement>;
  onBlur?: FocusEventHandler<HTMLButtonElement>;
  onTouchStart?: TouchEventHandler<HTMLButtonElement>;
  ariaLabel?: string;
};

const Button = forwardRef<HTMLButtonElement, Props>(
  (
    {
      children,
      type,
      onClick,
      onKeyDown,
      onPointerEnter,
      onPointerLeave,
      onPointerDown,
      onFocus,
      onBlur,
      onTouchStart,
      ariaLabel,
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        className={classNames(styles.button, {
          [styles.button_ghost]: type === "ghost",
          [styles.button_secondary]: type === "secondary",
          [styles.button_primary]: type === "primary",
        })}
        onClick={onClick}
        onKeyDown={onKeyDown}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        onFocus={onFocus}
        onBlur={onBlur}
        onPointerDown={onPointerDown}
        onTouchStart={onTouchStart}
        aria-label={ariaLabel}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export default Button;
