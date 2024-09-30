import { damp3, dampLookAt, dampM } from "maath/easing";
import { RefObject, ElementRef, useRef, useCallback } from "react";
import { Matrix4, Matrix4Tuple, Vector3, Vector3Like } from "three";

type FilterKeysByType<T, U> = Exclude<
  {
    [K in keyof T]: T[K] extends U ? K : never;
  }[keyof T],
  undefined
>;

const temporaryMatrix4 = new Matrix4();

export function useDampMatrix4(
  ref: RefObject<ElementRef<"group">>,
  key: FilterKeysByType<ElementRef<"group">, Matrix4>,
  damping: number
) {
  const isFirstUpdate = useRef(true);

  return useCallback(
    (value: Matrix4Tuple | Matrix4, delta: number) => {
      if (!ref.current) {
        return;
      }

      if (isFirstUpdate.current) {
        isFirstUpdate.current = false;

        if (Array.isArray(value)) {
          ref.current[key].fromArray(value);
        } else {
          ref.current[key].copy(value);
        }
      } else {
        dampM(
          ref.current[key],
          Array.isArray(value) ? temporaryMatrix4.fromArray(value) : value,
          damping,
          delta
        );
      }
    },
    [damping]
  );
}

export function useDampVector3(
  ref: RefObject<ElementRef<"group">>,
  key: FilterKeysByType<ElementRef<"group">, Vector3>,
  damping: number
) {
  const isFirstUpdate = useRef(true);

  return useCallback(
    (value: Vector3Like, delta: number) => {
      if (!ref.current) {
        return;
      }

      if (isFirstUpdate.current) {
        isFirstUpdate.current = false;
        ref.current[key].set(value.x, value.y, value.z);
      } else {
        damp3(ref.current[key], value as Vector3, damping, delta);
      }
    },
    [damping]
  );
}

export function useDampLookAt(
  ref: RefObject<ElementRef<"group">>,
  damping: number
) {
  const isFirstUpdate = useRef(true);

  return useCallback(
    (value: Vector3Like, delta: number) => {
      if (!ref.current) {
        return;
      }

      if (isFirstUpdate.current) {
        isFirstUpdate.current = false;
        ref.current.lookAt(value.x, value.y, value.z);
      } else {
        dampLookAt(ref.current, value as Vector3, damping, delta);
      }
    },
    [damping]
  );
}
