import { useLatest } from "@liveblocks/react/_private";
import { type RefObject, useEffect, useState } from "react";

interface ObserveOptions {
  rootMargin?: string | number;
  root?: RefObject<Element>;
  threshold?: number | number[];
}

interface Options extends ObserveOptions {
  enabled?: boolean;
}

interface VisibleOptions<T = boolean> extends Options {
  initialValue?: T;
}

type IntersectionObserverSingleCallback = (
  entry: IntersectionObserverEntry
) => void;

let optionlessIntersectionObserver: IntersectionObserver | undefined;
const optionlessIntersectionCallbacks = new WeakMap<
  Element,
  IntersectionObserverSingleCallback
>();

const individualIntersectionObservers = new WeakMap<
  Element,
  IntersectionObserver
>();

function observe(
  element: Element,
  callback: IntersectionObserverSingleCallback,
  options?: ObserveOptions
) {
  // Observers without options share a common IntersectionObserver instance, ones with options have their own
  if (!options) {
    if (!optionlessIntersectionObserver) {
      optionlessIntersectionObserver = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          const callback = optionlessIntersectionCallbacks.get(entry.target);

          callback?.(entry);
        }
      });
    }

    optionlessIntersectionCallbacks.set(element, callback);
    optionlessIntersectionObserver.observe(element);
  } else {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          callback?.(entry);
        }
      },
      {
        root: options.root?.current,
        rootMargin:
          typeof options.rootMargin === "number"
            ? `${options.rootMargin}px`
            : options.rootMargin,
        threshold: options.threshold,
      }
    );

    individualIntersectionObservers.set(element, observer);
    observer.observe(element);
  }
}

function unobserve(element: Element, options?: ObserveOptions) {
  if (!options) {
    optionlessIntersectionCallbacks.delete(element);
    optionlessIntersectionObserver?.unobserve(element);
  } else {
    const observer = individualIntersectionObservers.get(element);

    observer?.unobserve(element);
    individualIntersectionObservers.delete(element);
  }
}

/**
 * Observe when an element enters or exits the viewport.
 *
 * If you only need to get a stateful visibility value, use the higher level hook `useVisible` instead.
 */
export function useIntersectionCallback(
  ref: RefObject<Element>,
  callback: (isIntersecting: boolean, entry: IntersectionObserverEntry) => void,
  options?: Options
) {
  const enabled = options?.enabled ?? true;
  const latestCallback = useLatest(callback);
  const { root, rootMargin, threshold } = options ?? {};

  useEffect(() => {
    const element = ref.current;

    if (!element) {
      return;
    }

    const observeOptions: ObserveOptions = {
      root,
      rootMargin,
      threshold,
    };

    if (enabled) {
      observe(
        element,
        (entry) => {
          // The intersection observer entry might be useful in some cases but the main information
          // is whether the element is intersecting or not so we pass that as the first argument.
          latestCallback.current(entry.isIntersecting, entry);
        },
        observeOptions
      );
    } else {
      unobserve(element, observeOptions);
    }

    return () => {
      unobserve(element, observeOptions);
    };
  }, [ref, enabled, latestCallback, root, rootMargin, threshold]);
}

/**
 * Observe whether an element is currently visible or not.
 */
export function useVisible<T extends boolean | null = boolean>(
  ref: RefObject<Element>,
  options?: VisibleOptions<T>
) {
  const [isVisible, setVisible] = useState(
    options?.initialValue !== undefined ? options.initialValue : false
  );

  useIntersectionCallback(
    ref,
    (isIntersecting) => setVisible(isIntersecting),
    options
  );

  return isVisible;
}
