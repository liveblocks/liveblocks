"use client";

import type { PropsWithChildren } from "react";
import React from "react";

import { type Components, ComponentsProvider } from "./components";
import type { Overrides } from "./overrides";
import { OverridesProvider } from "./overrides";

type CommentsConfigProps = PropsWithChildren<{
  overrides?: Partial<Overrides>;
  components?: Partial<Components>;
}>;

/**
 * Set configuration options for all Comments components.
 *
 * @example
 * <CommentsConfig overrides={{ locale: "fr", USER_UNKNOWN: "Anonyme", ... }}>
 *   <App />
 * </CommentsConfig>
 */
export function CommentsConfig({
  overrides,
  components,
  children,
}: CommentsConfigProps) {
  return (
    <OverridesProvider overrides={overrides}>
      <ComponentsProvider components={components}>
        {children}
      </ComponentsProvider>
    </OverridesProvider>
  );
}
