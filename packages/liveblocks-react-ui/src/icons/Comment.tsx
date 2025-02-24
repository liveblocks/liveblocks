import type { ComponentProps } from "react";

import { Icon } from "../components/internal/Icon";

export function CommentIcon(props: ComponentProps<"svg">) {
  return (
    <Icon {...props}>
      <path d="M10 16a6 6 0 1 0-5.552-3.72c.094.229.12.482.052.719l-.753 2.636a.5.5 0 0 0 .618.618l2.636-.753a1.1 1.1 0 0 1 .719.052A6.002 6.002 0 0 0 10 16Z" />
    </Icon>
  );
}
