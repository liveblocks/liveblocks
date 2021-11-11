import React from "react";
import IconButton from "../IconButton";

type Props = {
  isActive: boolean;
  onClick: () => void;
};

export default function SelectionButton({ isActive, onClick }: Props) {
  return (
    <IconButton isActive={isActive} onClick={onClick}>
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
        <path d="M13 26V9L25 21.1428H18.2189L13 26Z" fill="currentColor" />
      </svg>
    </IconButton>
  );
}
