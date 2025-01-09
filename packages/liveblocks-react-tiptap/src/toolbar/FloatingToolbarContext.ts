import { createContext } from "react";

type FloatingToolbarContext = {
  close: () => void;
};

export const FloatingToolbarContext =
  createContext<FloatingToolbarContext | null>(null);
