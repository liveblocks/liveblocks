import { Extension } from "@tiptap/core";
import { PluginKey } from "@tiptap/pm/state";
import { ReactRenderer } from "@tiptap/react";
import { Suggestion, SuggestionProps } from "@tiptap/suggestion";
import { SlashCommandMenu } from "./menu";
import { getSlashCommandItems, SlashCommandItem } from "./items";

const slashCommandPluginKey = new PluginKey("slashCommand");

export const SlashCommand = Extension.create({
  name: "slashCommand",

  addProseMirrorPlugins() {
    return [
      Suggestion<SlashCommandItem>({
        editor: this.editor,
        char: "/",
        pluginKey: slashCommandPluginKey,
        allow: ({ state, range }) => {
          const $from = state.doc.resolve(range.from);
          return $from.parent.type.name !== "codeBlock";
        },
        items: ({ query }) => getSlashCommandItems(query),
        command: ({ editor, range, props }) => {
          props.command({ editor, range });
        },
        render: () => {
          let component: ReactRenderer | null = null;

          return {
            onStart: (props) => {
              component = new ReactRenderer(SlashCommandMenu, {
                props,
                editor: props.editor,
              });

              const element = getRendererElement(component);

              if (element) {
                document.body.appendChild(element);
                updateRendererPosition(element, props);
              }
            },
            onUpdate: (props) => {
              component?.updateProps(props);

              const element = getRendererElement(component);

              if (element) {
                updateRendererPosition(element, props);
              }
            },
            onKeyDown: (props) => {
              if (props.event.key === "Escape") {
                destroyRenderer(component);
                component = null;
                return true;
              }

              const ref = component?.ref;

              if (
                ref &&
                typeof ref === "object" &&
                "onKeyDown" in ref &&
                typeof ref.onKeyDown === "function"
              ) {
                return ref.onKeyDown(props);
              }

              return false;
            },
            onExit: () => {
              destroyRenderer(component);
              component = null;
            },
          };
        },
      }),
    ];
  },
});

function updateRendererPosition(
  element: HTMLElement,
  props: SuggestionProps<SlashCommandItem>
) {
  const rect = props.clientRect?.();

  if (!rect) {
    return;
  }

  element.style.position = "fixed";
  element.style.left = `${rect.left}px`;
  element.style.top = `${rect.bottom + 8}px`;
  element.style.zIndex = "50";
}

function getRendererElement(component: ReactRenderer | null) {
  if (component?.element instanceof HTMLElement) {
    return component.element;
  }

  return null;
}

function destroyRenderer(component: ReactRenderer | null) {
  const element = getRendererElement(component);
  component?.destroy();
  element?.remove();
}
