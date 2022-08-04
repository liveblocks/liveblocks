import { ComponentType, ReactNode } from "react";
import styles from "../../styles/Placeholder.module.css";

type Props = {
  icon?: ComponentType;
  onClick: () => void;
  children: ReactNode;
}

export default function Placeholder({ icon: Icon, onClick, children }: Props) {
  return (
    <button
      className={styles.placeholder}
      onClick={onClick}
    >
      {Icon ? (
        <Icon />
      ) : null}
      <span className={styles.placeholder_text}>{children}</span>
    </button>
  )
}
