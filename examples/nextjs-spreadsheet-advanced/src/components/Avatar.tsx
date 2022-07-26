import cx from "classnames";
import { ComponentProps, CSSProperties } from "react";
import styles from "./Avatar.module.css";

interface Props extends ComponentProps<"div"> {
  src: string;
  name: string;
  color: string;
}

export default function Avatar({
  src,
  name,
  color,
  style,
  className,
  ...props
}: Props) {
  return (
    <div
      className={cx(className, styles.container)}
      style={{ "--avatar-color": color, ...style } as CSSProperties}
      {...props}
    >
      <div className={styles.avatar}>
        <img src={src} alt={name} />
      </div>
    </div>
  );
}
