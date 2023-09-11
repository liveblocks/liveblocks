import type { PropsWithChildren } from "react";
import React from "react";

import type { Overrides } from "./overrides";
import { OverridesProvider } from "./overrides";

type CommentsConfigProps = PropsWithChildren<{
  overrides?: Partial<Overrides>;
}>;

/**
 * Set configuration options for all Comments components.
 *
 * @example
 * <CommentsConfig overrides={{ locale: "fr", UNKNOWN_USER: "Anonyme", ... }}>
 *   <App />
 * </CommentsConfig>
 */
export function CommentsConfig({ overrides, children }: CommentsConfigProps) {
  return (
    <OverridesProvider overrides={overrides}>{children}</OverridesProvider>
  );
}
