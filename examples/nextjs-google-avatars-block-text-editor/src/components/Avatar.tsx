import classNames from "classnames";
import styles from "./Avatar.module.css";
import Tooltip from "./Tooltip";

type Props = {
  imageUrl: string;
  name: string;
  size?: "sm" | "md";
  color?: string;
};

export default function Avatar({ imageUrl, name, size = "md", color }: Props) {
  return (
    <Tooltip content={name}>
      <button
        className={classNames(styles.avatar, {
          [styles.avatar_sm]: size === "sm",
          [styles.avatar_md]: size === "md",
        })}
      >
        <img src={imageUrl} alt="" />
        {color && (
          <span
            className={styles.avatar_color}
            style={{
              boxShadow: `0 0 0 2px ${color}, 0 0 0 4px rgb(var(--color-surface))`,
            }}
          />
        )}
      </button>
    </Tooltip>
  );
}
