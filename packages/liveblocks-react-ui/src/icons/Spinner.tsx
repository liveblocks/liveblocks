import type { ComponentProps } from "react";
import React from "react";

import { Icon, ICON_HEIGHT, ICON_WIDTH } from "../components/internal/Icon";

export function SpinnerIcon(props: ComponentProps<"svg">) {
  return (
    <Icon {...props}>
      <path d="M3 10a7 7 0 0 1 7-7">
        <animateTransform
          xmlns="http://www.w3.org/2000/svg"
          attributeName="transform"
          type="rotate"
          dur="0.75s"
          values={`0 ${ICON_WIDTH / 2} ${ICON_HEIGHT / 2};360 ${
            ICON_WIDTH / 2
          } ${ICON_HEIGHT / 2}`}
          repeatCount="indefinite"
        />
      </path>
    </Icon>
  );
}
