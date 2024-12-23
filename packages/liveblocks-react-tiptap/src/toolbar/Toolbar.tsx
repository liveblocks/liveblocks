import {
  BoldIcon,
  Button,
  capitalize,
  ChevronDownIcon,
  CodeIcon,
  CommentIcon,
  ItalicIcon,
  QuestionMarkIcon,
  RedoIcon,
  ShortcutTooltip,
  SparklesIcon,
  StrikethroughIcon,
  TooltipProvider,
  UnderlineIcon,
  UndoIcon,
} from "@liveblocks/react-ui/_private";
import * as SelectPrimitive from "@radix-ui/react-select";
import * as TogglePrimitive from "@radix-ui/react-toggle";
import type { Editor } from "@tiptap/react";
import type { ComponentProps, ComponentType, ReactNode } from "react";
import { forwardRef, useMemo, useState } from "react";

import { DEFAULT_AI_NAME } from "../ai/AiToolbar";
import { classNames } from "../classnames";
import { EditorProvider, useCurrentEditor } from "../context";
import type {
  AiToolbarExtensionStorage,
  ExtendedChainedCommands,
} from "../types";

export const FLOATING_ELEMENT_SIDE_OFFSET = 6;
export const FLOATING_ELEMENT_COLLISION_PADDING = 10;

export interface ToolbarSlotProps {
  editor: Editor;
}

export type ToolbarSlot = ReactNode | ComponentType<ToolbarSlotProps>;

export interface ToolbarProps extends Omit<ComponentProps<"div">, "children"> {
  editor: Editor | null;
  children?: ToolbarSlot;
  leading?: ToolbarSlot;
  trailing?: ToolbarSlot;
}

interface ToolbarButtonProps extends ComponentProps<"button"> {
  icon?: ReactNode;
  label: string;
  shortcut?: string;
}

interface ToolbarToggleProps extends ToolbarButtonProps {
  active: boolean;
}

interface ToolbarSelectOption {
  value: string;
  label?: string;
  icon?: ReactNode;
}

interface ToolbarSelectProps extends ComponentProps<"button"> {
  label: string;
  options: ToolbarSelectOption[];
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
  ({ icon, children, label, shortcut, ...props }, forwardedRef) => {
    return (
      <ShortcutTooltip content={label} shortcut={shortcut}>
        <Button
          type="button"
          variant="toolbar"
          ref={forwardedRef}
          icon={icon}
          {...props}
        >
          {children}
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

const ToolbarSelect = forwardRef<HTMLButtonElement, ToolbarSelectProps>(
  ({ options, ...props }, forwardedRef) => {
    // const editor = useCurrentEditor("ToolbarSelect", "Toolbar");
    const [value, setValue] = useState<string>();
    const formattedValue = useMemo(() => {
      const option = options.find((option) => option.value === value);

      return option ? option.label ?? capitalize(option.value) : undefined;
    }, [value, options]);

    // const parent = useEditorState({
    //   editor,
    //   selector: (ctx) => {
    //     return ctx.editor.state.selection.$from.parent.type;
    //   },
    // });

    return (
      <SelectPrimitive.Root value={value} onValueChange={setValue}>
        <ShortcutTooltip content="Turn into…">
          <SelectPrimitive.Trigger asChild {...props} ref={forwardedRef}>
            <Button type="button" variant="toolbar">
              {formattedValue ?? "Select…"}
              <ChevronDownIcon className="lb-dropdown-chevron" />
            </Button>
          </SelectPrimitive.Trigger>
        </ShortcutTooltip>
        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            position="popper"
            sideOffset={FLOATING_ELEMENT_SIDE_OFFSET}
            collisionPadding={FLOATING_ELEMENT_COLLISION_PADDING}
            className="lb-root lb-portal lb-elevation lb-dropdown"
          >
            {options.map((option) => (
              <SelectPrimitive.Item
                key={option.value}
                value={option.value}
                className="lb-dropdown-item"
              >
                {option.icon ? (
                  <span className="lb-icon-container">{option.icon}</span>
                ) : null}
                <span className="lb-dropdown-item-label">
                  {option.label ?? capitalize(option.value)}
                </span>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    );
  }
);

const ToolbarSeparator = forwardRef<HTMLDivElement, ToolbarSeparatorProps>(
  ({ className, ...props }, forwardedRef) => {
    return (
      <div
        ref={forwardedRef}
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
        label="Undo"
        icon={<UndoIcon />}
        shortcut="Mod-Z"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().chain().focus().undo().run()}
      />
      <ToolbarButton
        label="Redo"
        icon={<RedoIcon />}
        shortcut="Mod-Shift-Z"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().chain().focus().redo().run()}
      />
    </>
  );
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
      <ToolbarSelect
        label="Turn into"
        options={[
          {
            value: "Text",
          },
          {
            value: "Heading 1",
          },
        ]}
      />
      {supportsBold && (
        <ToolbarToggle
          label="Bold"
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
          label="Italic"
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
          label="Underline"
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
          label="Strikethrough"
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
          label="Inline code"
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
        <ToolbarButton
          label="Add a comment"
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
        >
          Comment
        </ToolbarButton>
      )}
    </>
  );
}

function ToolbarSectionAi() {
  const editor = useCurrentEditor("SectionAi", "Toolbar or FloatingToolbar");
  const supportsAi = "askAi" in editor.commands;
  const aiName =
    (
      editor.storage.liveblocksAiToolbar as
        | AiToolbarExtensionStorage
        | undefined
    )?.name ?? DEFAULT_AI_NAME;

  return (
    <>
      {supportsAi && (
        <>
          <ToolbarButton
            label={`Ask ${aiName} anything…`}
            icon={<SparklesIcon />}
            onClick={() =>
              (
                editor.chain().focus() as ExtendedChainedCommands<"askAi">
              ).askAi()
            }
          >
            Ask {aiName}
          </ToolbarButton>
          <ToolbarButton
            label="Explain"
            icon={<QuestionMarkIcon />}
            onClick={() =>
              (
                editor.chain().focus() as ExtendedChainedCommands<"askAi">
              ).askAi("Explain")
            }
          >
            Explain
          </ToolbarButton>
        </>
      )}
    </>
  );
}

function DefaultToolbarContent({ editor }: ToolbarSlotProps) {
  const supportsThread = "addPendingComment" in editor.commands;
  const supportsAi = "askAi" in editor.commands;

  return (
    <>
      <ToolbarSectionHistory />
      <ToolbarSeparator />
      {supportsAi ? (
        <>
          <ToolbarSectionAi />
          <ToolbarSeparator />
        </>
      ) : null}
      <ToolbarSectionInline />
      {supportsThread ? (
        <>
          <ToolbarSeparator />
          <ToolbarSectionCollaboration />
        </>
      ) : null}
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
    SectionInline: ToolbarSectionInline,
    SectionCollaboration: ToolbarSectionCollaboration,
    SectionAi: ToolbarSectionAi,
  }
);
