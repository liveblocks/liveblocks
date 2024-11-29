import {
  BoldIcon,
  Button,
  CodeIcon,
  CommentIcon,
  ItalicIcon,
  RedoIcon,
  ShortcutTooltip,
  StrikethroughIcon,
  TooltipProvider,
  UnderlineIcon,
  UndoIcon,
} from "@liveblocks/react-ui/_private";
import * as TogglePrimitive from "@radix-ui/react-toggle";
import type { ChainedCommands, Editor } from "@tiptap/react";
import type { ComponentProps, ComponentType, ReactNode } from "react";
import React, { forwardRef } from "react";

import { classNames } from "../classnames";
import { EditorProvider, useCurrentEditor } from "../context";

type ExtendedChainedCommands<
  T extends string,
  A extends any[] = [],
> = ChainedCommands & Record<T, (...args: A) => ChainedCommands>;

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

interface ToolbarButtonProps extends ComponentProps<"button"> {
  icon?: ReactNode;
  name: string;
  shortcut?: string;
}

interface ToolbarToggleProps extends ToolbarButtonProps {
  active: boolean;
}

type ToolbarSeparatorProps = ComponentProps<"div">;

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

const ToolbarButton = forwardRef<HTMLButtonElement, ToolbarButtonProps>(
  ({ icon, children, name, shortcut, ...props }, forwardedRef) => {
    return (
      <ShortcutTooltip content={name} shortcut={shortcut}>
        <Button type="button" ref={forwardedRef} {...props}>
          {icon}
          {children && <span className="lb-button-label">{children}</span>}
        </Button>
      </ShortcutTooltip>
    );
  }
);

const ToolbarToggle = forwardRef<HTMLButtonElement, ToolbarToggleProps>(
  ({ active, ...props }, forwardedRef) => {
    return (
      <TogglePrimitive.Root asChild pressed={active}>
        <ToolbarButton ref={forwardedRef} {...props} />
      </TogglePrimitive.Root>
    );
  }
);

const ToolbarSeparator = forwardRef<HTMLDivElement, ToolbarSeparatorProps>(
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

function ToolbarSectionHistory() {
  const editor = useCurrentEditor(
    "SectionHistory",
    "Toolbar or FloatingToolbar"
  );

  return (
    <>
      <ToolbarButton
        name="Undo"
        icon={<UndoIcon />}
        shortcut="Mod-Z"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().chain().focus().undo().run()}
      />
      <ToolbarButton
        name="Redo"
        icon={<RedoIcon />}
        shortcut="Mod-Shift-Z"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().chain().focus().redo().run()}
      />
    </>
  );
}

function ToolbarSectionAlignment() {
  const editor = useCurrentEditor(
    "SectionAlignment",
    "Toolbar or FloatingToolbar"
  );
  const supportsTextAlign = "setTextAlign" in editor.commands;

  type TextAlignChainedCommands = ExtendedChainedCommands<
    "setTextAlign",
    [{ align: string }]
  >;

  return supportsTextAlign ? (
    <>
      <ToolbarToggle
        name="Align left"
        icon={<BoldIcon />}
        shortcut="Mod-Shift-L"
        onClick={() =>
          (editor.chain().focus() as TextAlignChainedCommands)
            .setTextAlign({ align: "left" })
            .run()
        }
        disabled={
          !(editor.can().chain().focus() as TextAlignChainedCommands)
            .setTextAlign({ align: "left" })
            .run()
        }
        active={editor.isActive({ textAlign: "left" })}
      />
      <ToolbarToggle
        name="Align center"
        icon={<BoldIcon />}
        shortcut="Mod-Shift-E"
        onClick={() =>
          (editor.chain().focus() as TextAlignChainedCommands)
            .setTextAlign({ align: "center" })
            .run()
        }
        disabled={
          !(editor.can().chain().focus() as TextAlignChainedCommands)
            .setTextAlign({ align: "center" })
            .run()
        }
        active={editor.isActive({ textAlign: "center" })}
      />
      <ToolbarToggle
        name="Align right"
        icon={<BoldIcon />}
        shortcut="Mod-Shift-R"
        onClick={() =>
          (editor.chain().focus() as TextAlignChainedCommands)
            .setTextAlign({ align: "right" })
            .run()
        }
        disabled={
          !(editor.can().chain().focus() as TextAlignChainedCommands)
            .setTextAlign({ align: "right" })
            .run()
        }
        active={editor.isActive({ textAlign: "right" })}
      />
      <ToolbarToggle
        name="Justify"
        icon={<BoldIcon />}
        shortcut="Mod-Shift-J"
        onClick={() =>
          (editor.chain().focus() as TextAlignChainedCommands)
            .setTextAlign({ align: "justify" })
            .run()
        }
        disabled={
          !(editor.can().chain().focus() as TextAlignChainedCommands)
            .setTextAlign({ align: "justify" })
            .run()
        }
        active={editor.isActive({ textAlign: "justify" })}
      />
    </>
  ) : null;
}

function ToolbarSectionInline() {
  const editor = useCurrentEditor(
    "SectionInline",
    "Toolbar or FloatingToolbar"
  );
  const supportsBold = "toggleBold" in editor.commands;
  const supportsItalic = "toggleItalic" in editor.commands;
  const supportsUnderline = "toggleUnderline" in editor.commands;
  const supportsStrike = "toggleStrike" in editor.commands;
  const supportsCode = "toggleCode" in editor.commands;

  return (
    <>
      {supportsBold && (
        <ToolbarToggle
          name="Bold"
          icon={<BoldIcon />}
          shortcut="Mod-B"
          onClick={() =>
            (editor.chain().focus() as ExtendedChainedCommands<"toggleBold">)
              .toggleBold()
              .run()
          }
          disabled={
            !(
              editor
                .can()
                .chain()
                .focus() as ExtendedChainedCommands<"toggleBold">
            )
              .toggleBold()
              .run()
          }
          active={editor.isActive("bold")}
        />
      )}
      {supportsItalic && (
        <ToolbarToggle
          name="Italic"
          icon={<ItalicIcon />}
          shortcut="Mod-I"
          onClick={() =>
            (editor.chain().focus() as ExtendedChainedCommands<"toggleItalic">)
              .toggleItalic()
              .run()
          }
          disabled={
            !(
              editor
                .can()
                .chain()
                .focus() as ExtendedChainedCommands<"toggleItalic">
            )
              .toggleItalic()
              .run()
          }
          active={editor.isActive("italic")}
        />
      )}
      {supportsUnderline && (
        <ToolbarToggle
          name="Underline"
          icon={<UnderlineIcon />}
          shortcut="Mod-U"
          onClick={() =>
            (
              editor
                .chain()
                .focus() as ExtendedChainedCommands<"toggleUnderline">
            )
              .toggleUnderline()
              .run()
          }
          disabled={
            !(
              editor
                .can()
                .chain()
                .focus() as ExtendedChainedCommands<"toggleUnderline">
            )
              .toggleUnderline()
              .run()
          }
          active={editor.isActive("underline")}
        />
      )}
      {supportsStrike && (
        <ToolbarToggle
          name="Strike"
          icon={<StrikethroughIcon />}
          shortcut="Mod-U"
          onClick={() =>
            (editor.chain().focus() as ExtendedChainedCommands<"toggleStrike">)
              .toggleStrike()
              .run()
          }
          disabled={
            !(
              editor
                .can()
                .chain()
                .focus() as ExtendedChainedCommands<"toggleStrike">
            )
              .toggleStrike()
              .run()
          }
          active={editor.isActive("strike")}
        />
      )}
      {supportsCode && (
        <ToolbarToggle
          name="Inline code"
          icon={<CodeIcon />}
          shortcut="Mod-E"
          onClick={() =>
            (editor.chain().focus() as ExtendedChainedCommands<"toggleCode">)
              .toggleCode()
              .run()
          }
          disabled={
            !(
              editor
                .can()
                .chain()
                .focus() as ExtendedChainedCommands<"toggleCode">
            )
              .toggleCode()
              .run()
          }
          active={editor.isActive("code")}
        />
      )}
    </>
  );
}

function ToolbarSectionCollaboration() {
  const editor = useCurrentEditor(
    "SectionCollaboration",
    "Toolbar or FloatingToolbar"
  );
  const supportsThread = "addPendingComment" in editor.commands;

  return (
    <>
      {supportsThread && (
        <ToolbarToggle
          name="Add comment"
          icon={<CommentIcon />}
          onClick={() =>
            (
              editor
                .chain()
                .focus() as ExtendedChainedCommands<"addPendingComment">
            )
              .addPendingComment()
              .run()
          }
          disabled={editor.isActive("lb-comment")}
          active={editor.isActive("lb-comment")}
        />
      )}
    </>
  );
}

function DefaultToolbarContent({ editor }: ToolbarSlotProps) {
  const supportsTextAlign = "setTextAlign" in editor.commands;

  return (
    <>
      <ToolbarSectionHistory />
      <ToolbarSeparator />
      {supportsTextAlign ? (
        <>
          <ToolbarSectionAlignment />
          <ToolbarSeparator />
        </>
      ) : null}
      <ToolbarSectionInline />
      <ToolbarSeparator />
      <ToolbarSectionCollaboration />
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
        <TooltipProvider>
          <EditorProvider editor={editor}>
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
          </EditorProvider>
        </TooltipProvider>
      );
    }
  ),
  {
    Button: ToolbarButton,
    Toggle: ToolbarToggle,
    Separator: ToolbarSeparator,
    SectionHistory: ToolbarSectionHistory,
    SectionAlignment: ToolbarSectionAlignment,
    SectionInline: ToolbarSectionInline,
    SectionCollaboration: ToolbarSectionCollaboration,
  }
);
