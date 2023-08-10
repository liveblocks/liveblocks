import type { PropsWithChildren } from "react";
import React from "react";

import type { Overrides } from "./overrides";
import { OverridesProvider } from "./overrides";

type CommentsConfigProps = PropsWithChildren<{
  overrides?: Partial<Overrides>;
}>;

/**
 * TODO: Add description
 */
export function CommentsConfig({ overrides, children }: CommentsConfigProps) {
  return (
    <OverridesProvider overrides={overrides}>{children}</OverridesProvider>
  );
}
