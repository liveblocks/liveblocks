import type { ComponentProps } from "react";
import React from "react";

import { Icon } from "../components/internal/Icon";

export function CommentIcon(props: ComponentProps<"svg">) {
  return (
    <Icon {...props}>
      <path d="M10 16a6 6 0 1 0-5.686-4.08c.158.469.217.973.08 1.448l-.523 1.834a.75.75 0 0 0 .927.927l1.834-.524c.475-.136.979-.077 1.447.08A5.965 5.965 0 0 0 10 16Z" />
    </Icon>
  );
}
