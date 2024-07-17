import type { ComponentProps } from "react";
import React from "react";

import { Icon } from "../components/internal/Icon";

export function AttachmentIcon(props: ComponentProps<"svg">) {
  return (
    <Icon {...props}>
      <path d="m14.077 11.737-3.723 3.62c-1.55 1.507-4.128 1.507-5.678 0-1.543-1.5-1.543-4.02 0-5.52l5.731-5.573c1.034-1.006 2.754-1.007 3.789-.003 1.03 1 1.032 2.682.003 3.684l-5.744 5.572a1.377 1.377 0 0 1-1.893 0 1.283 1.283 0 0 1-.392-.92c0-.345.14-.676.392-.92L10.348 8" />
    </Icon>
  );
}
