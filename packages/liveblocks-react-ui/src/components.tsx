"use client";

import type {
  ComponentPropsWithoutRef,
  ComponentType,
  PropsWithChildren,
} from "react";
import { createContext, useContext, useMemo } from "react";

export interface GlobalComponents {
  Anchor: ComponentType<ComponentPropsWithoutRef<"a">> | "a";
}

export type Components = GlobalComponents;

type ComponentsProviderProps = PropsWithChildren<{
  components?: Partial<Components>;
}>;

export const defaultComponents: Components = {
  Anchor: "a",
};

export const ComponentsContext = createContext<Components | undefined>(
  undefined
);

export function useComponents(components?: Partial<Components>): Components {
  const contextComponents = useContext(ComponentsContext);

  return useMemo(
    () => ({
      ...defaultComponents,
      ...contextComponents,
      ...components,
    }),
    [contextComponents, components]
  );
}

export function ComponentsProvider({
  children,
  components: providerComponents,
}: ComponentsProviderProps) {
  const contextComponents = useContext(ComponentsContext);
  const components = useMemo(
    () => ({
      ...defaultComponents,
      ...contextComponents,
      ...providerComponents,
    }),
    [contextComponents, providerComponents]
  );

  return (
    <ComponentsContext.Provider value={components}>
      {children}
    </ComponentsContext.Provider>
  );
}
