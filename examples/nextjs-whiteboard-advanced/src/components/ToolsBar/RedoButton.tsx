import React from "react";
import IconButton from "../IconButton";

type Props = {
  onClick: () => void;
  disabled?: boolean;
};

export default function RedoButton({ onClick, disabled }: Props) {
  return (
    <IconButton onClick={onClick} disabled={disabled}>
      <svg
        width="36"
        height="36"
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g clipPath="url(#clip0_18:85)">
          <path
            d="M15 24H18V22H15C13.346 22 12 20.654 12 19C12 17.346 13.346 16 15 16H21V19L26 15L21 11V14H15C12.243 14 10 16.243 10 19C10 21.757 12.243 24 15 24Z"
            fill="#888888"
          />
        </g>
        <defs>
          <clipPath id="clip0_18:85">
            <rect width="36" height="36" fill="white" />
          </clipPath>
        </defs>
      </svg>
    </IconButton>
  );
}
