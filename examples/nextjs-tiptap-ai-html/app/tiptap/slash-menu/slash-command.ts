import { computePosition, flip, offset, shift } from "@floating-ui/dom";
import { Extension } from "@tiptap/core";
import { PluginKey } from "@tiptap/pm/state";
import { ReactRenderer } from "@tiptap/react";
import Suggestion, {
  SuggestionKeyDownProps,
  SuggestionProps,
} from "@tiptap/suggestion";
import { SlashCommandItem, filterItems } from "./items";
import { SlashMenu, SlashMenuHandle } from "./slash-menu";

// A dedicated key so this plugin can't collide with other suggestion
// plugins (e.g. the Liveblocks mention extension)
const slashCommandPluginKey = new PluginKey("slashCommand");

export const SlashCommand = Extension.create({
  name: "slashCommand",

  addProseMirrorPlugins() {
    return [
      Suggestion<SlashCommandItem>({
        editor: this.editor,
        pluginKey: slashCommandPluginKey,
        char: "/",
        allow: ({ state, range }) => {
          const $from = state.doc.resolve(range.from);
          return !$from.parent.type.spec.code;
        },
        items: ({ query }) => filterItems(query),
        command: ({ editor, range, props }) => {
          props.command({ editor, range });
        },
        render: () => {
          let component: ReactRenderer<SlashMenuHandle> | null = null;

          function updatePosition(props: SuggestionProps<SlashCommandItem>) {
            const rect = props.clientRect?.();

            if (!rect || !component) {
              return;
            }

            const element = component.element;
            element.style.position = "absolute";
            element.style.zIndex = "50";

            const computePosition$ = computePosition(
              { getBoundingClientRect: () => rect },
              element,
              {
                placement: "bottom-start",
                middleware: [
                  offset(8),
                  flip({ padding: 8 }),
                  shift({ padding: 8 }),
                ],
              }
            );

            computePosition$.then(({ x, y }) => {
              element.style.left = `${x}px`;
              element.style.top = `${y}px`;
            });
          }

          function destroy() {
            component?.element.remove();
            component?.destroy();
            component = null;
          }

          return {
            onStart: (props: SuggestionProps<SlashCommandItem>) => {
              component = new ReactRenderer(SlashMenu, {
                props,
                editor: props.editor,
              });

              document.body.appendChild(component.element);
              updatePosition(props);
            },

            onUpdate(props: SuggestionProps<SlashCommandItem>) {
              component?.updateProps(props);
              updatePosition(props);
            },

            onKeyDown(props: SuggestionKeyDownProps) {
              if (props.event.key === "Escape") {
                destroy();
                return true;
              }

              return component?.ref?.onKeyDown(props) ?? false;
            },

            onExit() {
              destroy();
            },
          };
        },
      }),
    ];
  },
});
