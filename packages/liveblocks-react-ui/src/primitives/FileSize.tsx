"use client";

import { Slot } from "radix-ui";
import type { ReactNode } from "react";
import { forwardRef, useMemo } from "react";

import type { ComponentPropsWithSlot } from "../types";
import { formatFileSize } from "../utils/format-file-size";

const FILE_SIZE_NAME = "FileSize";

export interface FileSizeProps
  extends Omit<ComponentPropsWithSlot<"span">, "children"> {
  /**
   * The file size to display.
   */
  size: number;

  /**
   * A function to format the displayed file size.
   */
  children?: (size: number, locale?: string) => ReactNode;

  /**
   * The locale used when formatting the file size.
   */
  locale?: string;
}

/**
 * Displays a formatted file size.
 *
 * @example
 * <FileSize size={100000} />
 */
export const FileSize = forwardRef<HTMLSpanElement, FileSizeProps>(
  (
    {
      size,
      locale,
      children: renderChildren = formatFileSize,
      asChild,
      ...props
    },
    forwardedRef
  ) => {
    const Component = asChild ? Slot.Slot : "span";
    const children = useMemo(
      () =>
        typeof renderChildren === "function"
          ? renderChildren(size, locale)
          : renderChildren,
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [renderChildren, size]
    );

    return (
      <Component {...props} ref={forwardedRef}>
        {children}
      </Component>
    );
  }
);

if (process.env.NODE_ENV !== "production") {
  FileSize.displayName = FILE_SIZE_NAME;
}
