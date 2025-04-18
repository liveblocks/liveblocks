import type { ComponentProps } from "react";

import { Icon } from "../components/internal/Icon";

export function BellCrossedIcon(props: ComponentProps<"svg">) {
  return (
    <Icon {...props}>
      <path d="M14 14H4.5s2-3 2-6.5c0-.3.05-.6.12-.88M8.2 4.5a3.5 3.5 0 0 1 5.3 3c0 .96.15 1.88.37 2.7M7.55 14a2.5 2.5 0 0 0 4.9 0M4.5 4.5l11 11" />
    </Icon>
  );
}
