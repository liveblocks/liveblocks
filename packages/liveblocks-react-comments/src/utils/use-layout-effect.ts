import { useEffect, useLayoutEffect as useDefaultLayoutEffect } from "react";

export const useLayoutEffect =
  typeof window !== "undefined" ? useDefaultLayoutEffect : useEffect;
