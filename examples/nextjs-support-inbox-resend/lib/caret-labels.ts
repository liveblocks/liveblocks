import { Extension } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";
import { getUsers } from "@/app/database";

/**
 * Restyles teammates' carets in the shared reply editor to match the assignee
 * chips: a small avatar and the name on a light pill, with the caret bar in
 * the person's color.
 *
 * The Liveblocks extension renders each caret label itself (name text on a
 * colored background) and doesn't take a custom renderer, so this plugin
 * rewrites those labels in the DOM after every editor update. The avatar is
 * looked up by name in the agent directory.
 */
export const CaretLabels = Extension.create({
  name: "caretLabels",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        view(view) {
          decorate(view.dom);
          return {
            update(view) {
              decorate(view.dom);
            },
          };
        },
      }),
    ];
  },
});

function decorate(root: HTMLElement) {
  const labels = root.querySelectorAll<HTMLElement>(
    ".collaboration-carets__label:not([data-decorated])"
  );
  for (const label of labels) {
    const name = label.textContent?.trim() ?? "";
    const agent = getUsers().find((user) => user.info.name === name);
    label.dataset.decorated = "";
    // The name is rendered by CSS (`::after { content: attr(data-name) }`),
    // so the pill always sizes to the full name.
    label.dataset.name = name;
    // The color stays on the caret bar; the label itself becomes a light pill.
    label.style.backgroundColor = "";
    label.replaceChildren();

    if (agent?.info.avatar) {
      const avatar = document.createElement("img");
      avatar.src = agent.info.avatar;
      avatar.alt = "";
      avatar.className = "collaboration-carets__avatar";
      label.append(avatar);
    }
  }
}
