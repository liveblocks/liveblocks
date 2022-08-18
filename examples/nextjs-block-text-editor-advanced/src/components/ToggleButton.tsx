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
import styles from "./ToggleButton.module.css";

type Props = {
  children: ReactNode;
  isSquare?: boolean;
  isActive?: boolean;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  onKeyDown?: KeyboardEventHandler<HTMLButtonElement>;
  onPointerEnter?: PointerEventHandler<HTMLButtonElement>;
  onPointerLeave?: PointerEventHandler<HTMLButtonElement>;
  onPointerDown?: PointerEventHandler<HTMLButtonElement>;
  onFocus?: FocusEventHandler<HTMLButtonElement>;
  onBlur?: FocusEventHandler<HTMLButtonElement>;
  onTouchStart?: TouchEventHandler<HTMLButtonElement>;
  ariaLabel?: string;
  className?: string;
};

const ToggleButton = forwardRef<HTMLButtonElement, Props>(
  (
    {
      children,
      isSquare,
      isActive,
      onClick,
      onKeyDown,
      onPointerEnter,
      onPointerLeave,
      onPointerDown,
      onFocus,
      onBlur,
      onTouchStart,
      ariaLabel,
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
            [styles.button_square]: isSquare,
            [styles.button_active]: isActive,
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
        type="button"
      >
        {children}
      </button>
    );
  }
);

ToggleButton.displayName = "ToggleButton";

export default ToggleButton;
