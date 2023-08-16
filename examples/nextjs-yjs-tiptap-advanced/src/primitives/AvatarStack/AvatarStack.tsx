import clsx from "clsx";
import { ComponentProps } from "react";
import { Avatar, AvatarEllipsis, Props as AvatarProps } from "../Avatar";
import { Tooltip } from "../Tooltip";
import styles from "./AvatarStack.module.css";

interface Props extends ComponentProps<"div"> {
  avatars: Pick<AvatarProps, "name" | "src" | "color">[];
  size?: number;
  max?: number;
  color?: string;
  tooltip?: boolean;
  tooltipProps?: Omit<ComponentProps<typeof Tooltip>, "children" | "content">;
}

export function AvatarStack({
  size = 24,
  max = 2,
  avatars,
  className,
  tooltip,
  tooltipProps,
  ...props
}: Props) {
  return (
    <div className={clsx(styles.stack, className)} {...props}>
      {avatars.length > max ? (
        <AvatarEllipsis
          className={styles.ellipsis}
          size={size}
          ellipsis={avatars.length - max}
          outline
          tooltip={tooltip}
          tooltipProps={tooltipProps}
        />
      ) : null}
      {avatars.slice(0, max).map(({ name, src, color }, index) => {
        return (
          <Avatar
            key={index}
            className={styles.avatar}
            name={name}
            src={src}
            color={color}
            size={size}
            outline
            tooltip={tooltip}
            tooltipProps={tooltipProps}
          />
        );
      })}
    </div>
  );
}
