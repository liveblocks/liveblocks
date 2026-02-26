import {
  type ComponentClass,
  type ComponentType,
  type FunctionComponent,
  useMemo,
  useRef,
} from "react";

function isClassComponent<P>(
  Component: ComponentType<P>
): Component is ComponentClass<P> {
  return Boolean(
    Component.prototype && "isReactComponent" in Component.prototype
  );
}

/**
 * Stabilizes a component by creating a stable wrapper that will not be remounted
 * when the component changes.
 */
export function useStableComponent<
  P extends object,
  D extends ComponentType<P>,
>(Component: ComponentType<P> | undefined, DefaultComponent: D): D {
  const Default: ComponentType<P> = DefaultComponent;
  const ref = useRef(Component);
  ref.current = Component;

  const Stable = useMemo<FunctionComponent<P>>(
    () => (props) => {
      const Component = ref.current;

      if (!Component) {
        return <Default {...props} />;
      }

      if (isClassComponent(Component)) {
        return <Component {...props} />;
      }

      return Component(props);
    },
    [Default]
  );

  return Stable as D;
}
