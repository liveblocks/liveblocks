import { type RefObject, useEffect, useState } from "react";

type Options = { enabled?: boolean };

type IntersectionObserverSingleCallback = (
  entry: IntersectionObserverEntry
) => void;

let intersectionObserver: IntersectionObserver;
const intersectionCallbacks = new WeakMap<
  Element,
  IntersectionObserverSingleCallback
>();

function observe(
  element: Element,
  callback: IntersectionObserverSingleCallback
) {
  if (!intersectionObserver) {
    intersectionObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const callback = intersectionCallbacks.get(entry.target);

        callback?.(entry);
      }
    });
  }

  intersectionCallbacks.set(element, callback);
  intersectionObserver.observe(element);
}

function unobserve(element: Element) {
  intersectionCallbacks.delete(element);
  intersectionObserver.unobserve(element);
}

export function useInView(ref: RefObject<Element>, options?: Options) {
  const [isInView, setInView] = useState(false);
  const enabled = options?.enabled ?? true;

  useEffect(() => {
    const element = ref.current;

    if (!element) {
      return;
    }

    if (enabled) {
      observe(element, (entry) => {
        setInView(entry.isIntersecting);
      });
    } else {
      unobserve(element);
    }

    return () => {
      unobserve(element);
    };
  }, [enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  return isInView;
}
