import cx from "classnames";
import { ComponentProps, CSSProperties, forwardRef } from "react";
import { Tooltip } from "./Tooltip";
import styles from "./Avatar.module.css";

export interface Props extends ComponentProps<"button"> {
  src: string;
  name: string;
  color: string;
  tooltipOffset?: number;
}

export const Avatar = forwardRef<HTMLButtonElement, Props>(
  ({ src, name, color, style, className, tooltipOffset, ...props }, ref) => {
    return (
      <Tooltip content={name} sideOffset={tooltipOffset}>
        <button
          className={cx(className, styles.container)}
          style={{ "--avatar-color": color, ...style } as CSSProperties}
          ref={ref}
          disabled
          {...props}
        >
          <div className={styles.avatar}>
            <img src={src} alt={name} />
          </div>
        </button>
      </Tooltip>
    );
  }
);
