import { useEffect, useState } from "react";

export type MediaQueryListCallback = (event: MediaQueryListEvent) => void;

export const addMediaQueryListener = (
  mediaQuery: MediaQueryList,
  callback: (event: MediaQueryListEvent) => void
) =>
  mediaQuery.addEventListener instanceof Function
    ? mediaQuery.addEventListener("change", callback)
    : mediaQuery.addListener(callback);

export const removeMediaQueryListener = (
  mediaQuery: MediaQueryList,
  callback: (event: MediaQueryListEvent) => void
) =>
  mediaQuery.removeEventListener instanceof Function
    ? mediaQuery.removeEventListener("change", callback)
    : mediaQuery.removeListener(callback);

export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);

    const handleMediaQueryChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    setMatches(mediaQuery.matches);
    addMediaQueryListener(mediaQuery, handleMediaQueryChange);

    return () => {
      removeMediaQueryListener(mediaQuery, handleMediaQueryChange);
    };
  }, [query]);

  return matches;
}
