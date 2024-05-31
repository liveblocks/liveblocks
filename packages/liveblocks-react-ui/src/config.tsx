"use client";

import type { PropsWithChildren } from "react";
import React, { createContext, useContext, useMemo } from "react";

import { type Components, ComponentsProvider } from "./components";
import type { Overrides } from "./overrides";
import { OverridesProvider } from "./overrides";

type LiveblocksUIConfigProps = PropsWithChildren<{
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

interface LiveblocksUIConfigContext {
  portalContainer?: HTMLElement;
}

const LiveblocksUIConfigContext = createContext<LiveblocksUIConfigContext>({});

export function useLiveblocksUIConfig() {
  return useContext(LiveblocksUIConfigContext);
}

/**
 * Set configuration options for all components.
 *
 * @example
 * <LiveblocksUIConfig overrides={{ locale: "fr", USER_UNKNOWN: "Anonyme", ... }}>
 *   <App />
 * </LiveblocksUIConfig>
 */
export function LiveblocksUIConfig({
  overrides,
  components,
  portalContainer,
  children,
}: LiveblocksUIConfigProps) {
  const liveblocksUIConfig = useMemo(
    () => ({ portalContainer }),
    [portalContainer]
  );

  return (
    <LiveblocksUIConfigContext.Provider value={liveblocksUIConfig}>
      <OverridesProvider overrides={overrides}>
        <ComponentsProvider components={components}>
          {children}
        </ComponentsProvider>
      </OverridesProvider>
    </LiveblocksUIConfigContext.Provider>
  );
}
