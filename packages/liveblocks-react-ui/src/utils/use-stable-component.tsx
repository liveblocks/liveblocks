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
export function useStableComponent<P extends object>(
  Component: ComponentType<P> | undefined,
  DefaultComponent: ComponentType<P>
): ComponentType<P> {
  const ref = useRef(Component);
  ref.current = Component;

  const StableComponent = useMemo<FunctionComponent<P>>(
    () => (props) => {
      const Component = ref.current;

      if (!Component) {
        return <DefaultComponent {...props} />;
      }

      if (isClassComponent(Component)) {
        return <Component {...props} />;
      }

      return Component(props);
    },
    [DefaultComponent]
  );

  return StableComponent;
}
