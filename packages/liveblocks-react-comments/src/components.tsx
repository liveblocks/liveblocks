"use client";

import type {
  ComponentPropsWithoutRef,
  ComponentType,
  PropsWithChildren,
} from "react";
import { createContext, useContext, useMemo } from "react";
import * as React from "react";

type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] };

export interface GlobalComponents {
  Anchor:
    | ComponentType<WithRequired<ComponentPropsWithoutRef<"a">, "href">>
    | "a";
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
