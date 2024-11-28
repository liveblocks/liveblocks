import type { Editor } from "@tiptap/react";
import type { ComponentProps, ComponentType, ReactNode } from "react";
import React, { forwardRef } from "react";

import { classNames } from "../classnames";

export interface ToolbarSlotProps {
  editor: Editor;
}

export type ToolbarSlot = ReactNode | ComponentType<ToolbarSlotProps>;

interface ToolbarProps extends Omit<ComponentProps<"div">, "children"> {
  editor: Editor | null;
  children?: ToolbarSlot;
  leading?: ToolbarSlot;
  trailing?: ToolbarSlot;
}

export function applyToolbarSlot(
  slot: ToolbarSlot,
  props: ToolbarSlotProps
): ReactNode {
  if (typeof slot === "function") {
    const Component = slot;

    return <Component {...props} />;
  }

  return slot;
}

// TODO: Toolbar.Button = type="button"
// TODO: Toolbar.Toggle = aria-pressed
// TODO: Toolbar.Separator = <div role="separator" aria-orientation="vertical" />

const ToolbarSeparator = forwardRef<HTMLDivElement, ComponentProps<"div">>(
  ({ className, ...props }) => {
    return (
      <div
        role="separator"
        aria-orientation="vertical"
        className={classNames("lb-tiptap-toolbar-separator", className)}
        {...props}
      />
    );
  }
);

export function DefaultToolbarContent({ editor }: ToolbarSlotProps) {
  const supportsBold = "toggleBold" in editor.commands;
  const supportsItalic = "toggleItalic" in editor.commands;
  const supportsStrike = "toggleStrike" in editor.commands;
  const supportsCode = "toggleCode" in editor.commands;

  return (
    <>
      {supportsBold && "Bold"}
      {supportsItalic && "Italic"}
      {supportsStrike && "Strikethrough"}
      {supportsCode && "Inline code"}
      <ToolbarSeparator />
      Section
    </>
  );
}

export const Toolbar = Object.assign(
  forwardRef<HTMLDivElement, ToolbarProps>(
    (
      {
        leading,
        trailing,
        children = DefaultToolbarContent,
        editor,
        className,
        ...props
      },
      forwardedRef
    ) => {
      if (!editor) {
        return null;
      }

      const slotProps: ToolbarSlotProps = { editor };

      return (
        <div
          ref={forwardedRef}
          role="toolbar"
          aria-label="Toolbar"
          aria-orientation="horizontal"
          className={classNames("lb-root lb-tiptap-toolbar", className)}
          {...props}
        >
          {applyToolbarSlot(leading, slotProps)}
          {applyToolbarSlot(children, slotProps)}
          {applyToolbarSlot(trailing, slotProps)}
        </div>
      );
    }
  ),
  {
    Separator: ToolbarSeparator,
  }
);
