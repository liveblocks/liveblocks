import type { ComponentProps } from "react";

import { Icon } from "../components/internal/Icon";

export function ListUnorderedIcon(props: ComponentProps<"svg">) {
  return (
    <Icon {...props}>
      <path d="M16 14.25H8M16 10H8m8-4.25H8m-3.75 0h0" />
      <circle cx={4.25} cy={5.75} r={0.25} />
      <path d="M4.25 14.25h0" />
      <circle cx={4.25} cy={14.25} r={0.25} />
      <path d="M4.25 10h0" />
      <circle cx={4.25} cy={10} r={0.25} />
    </Icon>
  );
}
