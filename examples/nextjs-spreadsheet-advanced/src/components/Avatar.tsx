import cx from "classnames";
import { type CSSProperties, type ComponentProps, forwardRef } from "react";
import styles from "./Avatar.module.css";
import { Tooltip } from "./Tooltip";

export interface Props extends ComponentProps<"button"> {
  color: string;
  name: string;
  src: string;
  tooltipOffset?: number;
}

export const Avatar = forwardRef<HTMLButtonElement, Props>(
  ({ src, name, color, style, className, tooltipOffset, ...props }, ref) => {
    return (
      <Tooltip content={name} sideOffset={tooltipOffset}>
        <button
          className={cx(className, styles.container)}
          disabled
          ref={ref}
          style={{ "--avatar-color": color, ...style } as CSSProperties}
          {...props}
        >
          <div className={styles.avatar}>
            <img alt={name} src={src} />
          </div>
        </button>
      </Tooltip>
    );
  }
);
