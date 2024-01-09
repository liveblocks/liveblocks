"use client";

import type { PropsWithChildren } from "react";
import React, { createContext, useContext, useMemo } from "react";

import type { Overrides } from "./overrides";
import { OverridesProvider } from "./overrides";

type CommentsConfigProps = PropsWithChildren<{
  /**
   * Override the components' strings.
   */
  overrides?: Partial<Overrides>;

  /**
   * The container to render the portal into.
   */
  portalContainer?: HTMLElement;
}>;

interface CommentsConfigContext {
  portalContainer?: HTMLElement;
}

const CommentsConfigContext = createContext<CommentsConfigContext>({});

export function useCommentsConfig() {
  return useContext(CommentsConfigContext);
}

/**
 * Set configuration options for all Comments components.
 *
 * @example
 * <CommentsConfig overrides={{ locale: "fr", UNKNOWN_USER: "Anonyme", ... }}>
 *   <App />
 * </CommentsConfig>
 */
export function CommentsConfig({
  overrides,
  portalContainer,
  children,
}: CommentsConfigProps) {
  const commentsConfig = useMemo(
    () => ({ portalContainer }),
    [portalContainer]
  );

  return (
    <CommentsConfigContext.Provider value={commentsConfig}>
      <OverridesProvider overrides={overrides}>{children}</OverridesProvider>
    </CommentsConfigContext.Provider>
  );
}
