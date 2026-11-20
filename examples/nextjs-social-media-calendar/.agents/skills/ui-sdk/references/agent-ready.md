# Make it agent-ready

An app built with ui-sdk can let an agent read its components and call their actions directly, through `createAgent`, instead of clicking through the page. An interface is agent-ready when an agent can find every control by name, call what it needs, and the app sees each change as the agent's and can refuse it.

The full docs are the Agents pages: `docs/agents.md` in each package, or https://ui-sdk.dev/docs/agents.

## The checklist

1. **Every control has a name.** The bridge's `label` is the accessible name: `FieldLabel`, the component's label part, or `aria-label`. Labels should be unique where they sit, because a step finds its component by label (`{ ref: "Project name", … }`). Two "Name" fields in two sections are fine only if a step can still tell them apart by ref or row text.
   - A label matches every label that holds its words, and an exact match doesn't win, since labels are page text other people can write. "Tip" and "Custom tip" collide, and so do a "Water the plants" button and a "Done today: Water the plants" checkbox. Give each control in a row a verb of its own ("Open Water the plants"), so none is the bare title.
   - Items and tabs are named by their visible text. `aria-label` on an item is ignored.
   - A part like a password's Show toggle or a number input's step buttons belongs to its component's entry, and doesn't need a name unique on the page.
   - Components that only support another still show up. Give a shared Tooltip its own `aria-label`, an Avatar `role="img"` with `aria-label`, and an Accordion with more than one section `aria-label` on its root. Put `aria-hidden="true"` on a decorative one, which hides it from agents too, and `data-agent-hidden` on a toast region (it drops its label while it's empty).
   - A Dialog with several triggers has no name while it's closed: put `keepMounted` on its content, so its title names it. A Menu can't take a name of its own, so don't share one Menu between rows: give each row its own Menu, with a trigger named for its row, like `aria-label="Actions for Jane Doe"`. Labels inside a dialog should differ from the page's too: the bridge still sees the page behind an open modal.
2. **Every control an agent should use is one of our parts.** `snapshot()` lists only ui-sdk components. These are invisible, so an agent can't fill or press them:
   - a plain `<button>`: use `Button` (`<ui-button><button>…</button></ui-button>` in web components), including submit buttons and a wizard's Back and Continue;
   - a bare `<input>`, `<textarea>` or `<select>`, and `FieldControl`: use `Input`, `Textarea`, `NumberInput` or `Select` inside a `Field`. In web components that's `<ui-field>` with `<ui-input><input /></ui-input>` inside, never a bare `<input>`;
   - a custom primitive's step it can't take, like a linear stepper's next step: make the action that completes it (the Continue button) one of ours too.
3. **State flows through change callbacks.** Keep app state in sync through `onValueChange` (and the other `on<Key>Change` callbacks), not through DOM listeners. Agent changes call the component's API, not keyboard or pointer handlers, so checks in `onKeyDown` or `onClick` never see them. In the callback, `details.source === "agent"` tells an agent's change apart, and `details.cancel()` refuses it.
   - What a popup shows comes from its `payload` or app state, not a trigger's `onClick`: an agent can open it with `setOpen`, which runs no click. When a popup has several triggers, a `press` with one's text, like "Edit Beta", clicks it.
   - `minLength` doesn't stop a value an agent sets, since browsers only check it while a person types. Use `pattern=".{8,}"` or your own validation.
4. **Mark what needs a person.** Three attributes, and only these three:
   - `data-agent-confirm="<what it does>"` on anything an agent must not do alone, like delete, pay or send. It covers the element and everything inside it. Write the sentence for the person who'll be asked, "Deletes the project and all its files", from app state, not from a dialog's `payload`, which is gone while the dialog is closed. For a confirm dialog, put it on the button that confirms, `<AlertDialogClose value="confirm">`, not on the trigger (opening the dialog is harmless) or the content (that gates Cancel too). Give that button text that isn't part of the trigger's, like "Delete forever" for a "Delete project" trigger: a press looks among the buttons already on the page first, so "Delete" would match the trigger. The same goes for a menu item and the buttons inside its context menu's area.
   - `data-agent-secret` on a field whose value an agent may fill but never read. Password, card and one-time-code fields are already secret.
   - `data-agent-hidden` on a region an agent shouldn't see at all, like recovery codes.
5. **Your own primitives say what they do.** Every `definePrimitive` ends with an `agent` key:

   ```ts
   agent: { actions: ["rate"] },
   ```

   | Key                         | Use it when                                                                                                                         |
   | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
   | `actions`                   | Always. The api methods an agent may call. Without it, only methods named like `setValue`, `open`, `toggle` or `clear` are offered. |
   | `closed: true`              | The value is always one of its items, like a size picker. A step that names another item is refused with the real ones.             |
   | `items: (api) => …`         | The items aren't in the state's `items`. Return `{ value, label }` objects.                                                         |
   | `reveals: true`             | Closed items hide other components, like tabs or an accordion.                                                                      |
   | `shown: (state) => boolean` | It only matters sometimes, like a field wrapper while it has errors.                                                                |
   | `secret: true`              | Its value must never be read, like a PIN.                                                                                           |

## Connect the bridge

Create the bridge once, in the browser, from the same package as the components:

| Framework      | Import                                               |
| -------------- | ---------------------------------------------------- |
| React          | `import { createAgent } from "@ui-sdk/react/agent"`  |
| Vue            | `import { createAgent } from "@ui-sdk/vue/agent"`    |
| Svelte         | `import { createAgent } from "@ui-sdk/svelte/agent"` |
| Solid          | `import { createAgent } from "@ui-sdk/solid/agent"`  |
| Web components | `import { createAgent } from "@ui-sdk/web/agent"`    |

```ts
import { agentTools, createAgent, registerTools } from "@ui-sdk/react/agent"

const agent = createAgent({
  allow: (step, { signal }) =>
    step.confirm ? askThePerson(step.confirm, { signal }) : true,
})

export { agent }
```

- `agent.snapshot()` lists the components, their state and their `actions`. `agent.act({ steps })` runs steps in order. `agent.query({ text, within, kind })` finds components and list items.
- **Your own model:** `agentTools` has the three tools' names, descriptions and JSON Schemas. Route each tool call to the matching method on `agent` and return its result.
- **A browser agent (WebMCP):** `const unregister = registerTools(agent, { allow })`. It does nothing in a browser without `document.modelContext`. `allow` is required here, since you didn't write that agent. Ask the person in one place: when the bridge's own `allow` already asks, as above, pass `allow: () => true` here, or every marked step asks twice.
- `allow` returns `true`, `false`, or a `Promise<boolean>` for your own confirmation UI. Without it, steps on `data-agent-confirm` fail with "Needs a person".
- In Next.js and other server rendering setups, create the bridge in client code only, like a `"use client"` module imported by a client component.

## Prove it with a test

Write this test for every interface you build. It runs in jsdom with the framework's testing library, after the [jsdom stubs](testing.md#jsdom), since a Select opens to resolve an item by its label. This is React; the other frameworks render the same way their own tests do:

```tsx
import { render, screen } from "@testing-library/react"
import { createAgent } from "@ui-sdk/react/agent"
import { expect, test } from "vitest"
import { ProjectSettings } from "./project-settings"

test("an agent can find and change every setting", async () => {
  const agent = createAgent()
  render(<ProjectSettings />)

  const components = agent
    .snapshot()
    .filter((entry) => !entry.offPage && entry.component !== "more")
  for (const entry of components) {
    expect(
      entry.label,
      `${entry.component} ${entry.ref} has no name`
    ).toBeTruthy()
  }
  const labels = components.map((entry) => entry.label)
  for (const label of ["Project name", "Visibility", "Weekly digest"]) {
    expect(labels, `${label} is missing from the snapshot`).toContain(label)
  }

  const result = await agent.act({
    steps: [
      { ref: "Project name", action: "setValue", args: ["Atlas"] },
      { ref: "Visibility", action: "setValue", args: ["Internal"] },
    ],
  })
  expect(result.ok, result.error?.message).toBe(true)
  expect(screen.getByLabelText<HTMLInputElement>("Project name").value).toBe(
    "Atlas"
  )
})
```

- The entry with `component: "more"` comes last when the page has more than 100 components, and says how many `query` can find.
- Create one bridge per test file: it has no `destroy`, and it remembers components earlier tests removed as `offPage`. Unmount between tests: with Vitest, Testing Library only cleans up when `globals: true` is set, so otherwise add `afterEach(cleanup)`.
- Don't filter entries out of the label check. An unnamed entry is a control an agent can't find: name it or hide it.
- List every control the task names in the `labels` check, so a control the bridge can't see fails the test. Add one `act` step for every control the task names, using the words a person would use. If a step fails, its `error.message` says why, like an ambiguous label with each match's ref.
- For a `data-agent-confirm` control, give the file's one bridge an `allow` you can flip, and assert the step is refused, then runs:

  ```ts
  let approve = false
  const agent = createAgent({ allow: (step) => !step.confirm || approve })
  const remove = {
    steps: [
      { ref: "Delete project", action: "press", args: ["Delete forever"] },
    ],
  }

  expect((await agent.act(remove)).ok).toBe(false)
  approve = true
  expect((await agent.act(remove)).ok).toBe(true)
  ```

- A refused press closes the dialog it opened before `act` returns.
- `press` with a button's text opens a closed dialog or menu to find it, and `press` with no text opens it through its trigger. Once a dialog is open, its label is its title, not the trigger's text.
- `act` can return `ok: true` while a change callback cancelled a value. Check `result.values` or the DOM, not only `ok`.
- **An agent needs to find the choices an action takes.** The snapshot lists a component's `items` with it: the item and tab parts on the page, named by their text, or else its data when there are 10 or fewer. Data comes from the state's `items`, or from `agent.items` for any action, like a stepper's `goTo`. Longer lists come back from `query({ within: "<label>" })`. In the agent test, take the value from `snapshot()` or `query`, not from your own data. `query` resolves to a list of components or `{ error }`, so check which before you destructure it.

Also look at the snapshot once by hand (`console.log(JSON.stringify(agent.snapshot(), null, 2))`): every entry should have a label a person would recognize, the actions you expect, and no `"actions": []` on a custom primitive that should do something.
