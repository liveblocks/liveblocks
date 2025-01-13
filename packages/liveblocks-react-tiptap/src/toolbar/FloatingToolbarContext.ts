import { createContext } from "react";

// This file is separate to avoid circular dependencies

type FloatingToolbarContext = {
  close: () => void;
  registerExternal: (id: string) => () => void;
};

export const FloatingToolbarContext =
  createContext<FloatingToolbarContext | null>(null);
