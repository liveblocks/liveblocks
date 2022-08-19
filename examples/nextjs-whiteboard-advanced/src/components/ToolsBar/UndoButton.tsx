import React from "react";
import IconButton from "../IconButton";

type Props = {
  onClick: () => void;
  disabled?: boolean;
};

export default function UndoButton({ onClick, disabled }: Props) {
  return (
    <IconButton onClick={onClick} disabled={disabled}>
      <svg
        width="36"
        height="36"
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M15 16H21C22.654 16 24 17.346 24 19C24 20.654 22.654 22 21 22H18V24H21C23.757 24 26 21.757 26 19C26 16.243 23.757 14 21 14H15V11L10 15L15 19V16Z"
          fill="#888888"
        />
      </svg>
    </IconButton>
  );
}
