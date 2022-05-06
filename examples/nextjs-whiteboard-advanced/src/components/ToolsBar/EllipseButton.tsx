import React from "react";
import IconButton from "../IconButton";

type Props = {
  isActive: boolean;
  onClick: () => void;
};

export default function EllipseButton({ isActive, onClick }: Props) {
  return (
    <IconButton isActive={isActive} onClick={onClick}>
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M11 18C11 21.866 14.134 25 18 25C21.866 25 25 21.866 25 18C25 14.134 21.866 11 18 11C14.134 11 11 14.134 11 18ZM18 9C13.0294 9 9 13.0294 9 18C9 22.9706 13.0294 27 18 27C22.9706 27 27 22.9706 27 18C27 13.0294 22.9706 9 18 9Z"
          fill="currentColor"
        />
      </svg>
    </IconButton>
  );
}
