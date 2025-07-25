import type { ComponentProps } from "react";

import { Icon } from "../components/internal/Icon";

export function UserIcon(props: ComponentProps<"svg">) {
  return (
    <Icon {...props}>
      <path d="M10 9.75a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Zm0 0a5.002 5.002 0 0 0-4.901 4.006c-.11.542.349.994.901.994h8c.552 0 1.01-.452.901-.994A5.002 5.002 0 0 0 10 9.75Z" />
    </Icon>
  );
}
