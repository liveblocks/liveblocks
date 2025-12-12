"use client";

import { MouseEventHandler } from "react";
import { CrossIcon, MenuIcon } from "@/icons";
import styles from "./DashboardHeader.module.css";

interface Props {
  isOpen: boolean;
  onMenuClick: MouseEventHandler<HTMLButtonElement>;
}

export function DashboardHeaderMenu({ isOpen, onMenuClick }: Props) {
  return (
    <div className={styles.menu}>
      <button className={styles.menuToggle} onClick={onMenuClick}>
        {isOpen ? <CrossIcon /> : <MenuIcon />}
      </button>
    </div>
  );
}
