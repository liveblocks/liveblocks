import React from "react";
import IconButton from "../IconButton";

type Props = {
  onClick: () => void;
};

export default function ImageButton({ onClick }: Props) {
  return (
    <IconButton onClick={onClick}>
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M11 10H25C25.5523 10 26 10.4477 26 11V25C26 25.5523 25.5523 26 25 26H11C10.4477 26 10 25.5523 10 25V11C10 10.4477 10.4477 10 11 10ZM12 12V22.5858L15.2929 19.2929C15.6834 18.9024 16.3166 18.9024 16.7071 19.2929L18 20.5858L21.2929 17.2929C21.6834 16.9024 22.3166 16.9024 22.7071 17.2929L24 18.5858V12H12ZM24 21.4142L22 19.4142L18.7071 22.7071C18.3166 23.0976 17.6834 23.0976 17.2929 22.7071L16 21.4142L13.4142 24H24V21.4142ZM16 16C16 16.5523 15.5523 17 15 17C14.4477 17 14 16.5523 14 16C14 15.4477 14.4477 15 15 15C15.5523 15 16 15.4477 16 16Z"
          fill="currentColor"
        />
      </svg>
    </IconButton>
  );
}
