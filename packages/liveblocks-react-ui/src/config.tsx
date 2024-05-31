"use client";

import type { PropsWithChildren } from "react";
import React, { createContext, useContext, useMemo } from "react";

import { type Components, ComponentsProvider } from "./components";
import type { Overrides } from "./overrides";
import { OverridesProvider } from "./overrides";

type LiveblocksUiConfigProps = PropsWithChildren<{
  /**
   * Override the components' strings.
   */
  overrides?: Partial<Overrides>;

  /**
   * Override the components' components.
   */
  components?: Partial<Components>;

  /**
   * The container to render the portal into.
   */
  portalContainer?: HTMLElement;
}>;

interface LiveblocksUiConfigContext {
  portalContainer?: HTMLElement;
}

const LiveblocksUiConfigContext = createContext<LiveblocksUiConfigContext>({});

export function useLiveblocksUiConfig() {
  return useContext(LiveblocksUiConfigContext);
}

/**
 * Set configuration options for all components.
 *
 * @example
 * <LiveblocksUiConfig overrides={{ locale: "fr", USER_UNKNOWN: "Anonyme", ... }}>
 *   <App />
 * </LiveblocksUiConfig>
 */
export function LiveblocksUiConfig({
  overrides,
  components,
  portalContainer,
  children,
}: LiveblocksUiConfigProps) {
  const liveblocksUiConfig = useMemo(
    () => ({ portalContainer }),
    [portalContainer]
  );

  return (
    <LiveblocksUiConfigContext.Provider value={liveblocksUiConfig}>
      <OverridesProvider overrides={overrides}>
        <ComponentsProvider components={components}>
          {children}
        </ComponentsProvider>
      </OverridesProvider>
    </LiveblocksUiConfigContext.Provider>
  );
}
