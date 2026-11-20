# Build an interface from ui-sdk components

## 1. Find the components

Read `node_modules/@ui-sdk/<framework>/docs/llms.txt` for the list, or https://ui-sdk.dev/web.md on a page with no build step, then pick from this table. Read each picked component's page, `docs/components/<name>.md` (the page `web.md` links), before writing it: its Composition shows the parts and how they nest, and its API lists props, state attributes and change reasons.

| The person needs to                                  | Use                                                                      |
| ---------------------------------------------------- | ------------------------------------------------------------------------ |
| Run an action                                        | Button                                                                   |
| Turn a setting on or off                             | Switch                                                                   |
| Keep a button pressed, or a group of pressed buttons | Toggle                                                                   |
| Choose one or more independent options               | Checkbox                                                                 |
| Choose one of a few options, all visible             | Radio, or Segmented Control for a compact row                            |
| Choose one or several from a popup list              | Select                                                                   |
| Choose from an always-visible list                   | Listbox                                                                  |
| Search a list and choose one or several              | Combobox                                                                 |
| Type free text with suggestions                      | Autocomplete                                                             |
| Search and run commands                              | Command                                                                  |
| Mention or tag with @, / or # while typing           | Trigger Menu                                                             |
| Mix text with tokens for people, files or tags       | Token Input                                                              |
| Enter text                                           | Input, or Textarea for several lines                                     |
| Enter a number                                       | Number Input (for money, `step={0.01}`: a step of 1 rounds the cents)    |
| Enter a password                                     | Password Input                                                           |
| Enter a one-time code                                | OTP Input                                                                |
| Enter a date                                         | Date Input, or Date Picker with a calendar                               |
| Pick dates from a month grid                         | Calendar                                                                 |
| Enter a time                                         | Time Input                                                               |
| Pick a number or range by dragging                   | Slider                                                                   |
| Pick a score                                         | Rating                                                                   |
| Pick a color                                         | Color Picker                                                             |
| Choose, drop or paste files                          | File Input                                                               |
| Crop an image                                        | Image Cropper                                                            |
| Label a control, with a description and errors       | Field, with Label                                                        |
| Confirm before an action                             | Alert Dialog (`AlertDialogClose value="confirm"` is the agreeing answer) |
| Do a focused task over the page                      | Dialog, or Drawer from an edge                                           |
| Edit or explore something beside its trigger         | Popover                                                                  |
| Choose actions from a button or a right click        | Menu                                                                     |
| An application menu bar                              | Menubar                                                                  |
| Group buttons and toggles with one tab stop          | Toolbar                                                                  |
| Name a control or add a short hint                   | Tooltip                                                                  |
| Preview a link                                       | Hover Card                                                               |
| Site navigation with panels                          | Navigation Menu                                                          |
| Switch between panels                                | Tabs                                                                     |
| Show and hide sections                               | Accordion, or Collapsible for one                                        |
| Browse a hierarchy                                   | Tree                                                                     |
| Pick from a grid, like seats                         | Your own component on `createGridFocus`                                  |
| Drag to reorder a list, or cards between columns     | Your own component on `createReorder` or `createTransfer`                |
| Show a trace or request timings on a time axis       | Waterfall                                                                |
| Page through results                                 | Pagination                                                               |
| Page through slides                                  | Carousel                                                                 |
| Resizable panels                                     | Resizable                                                                |
| Styled scrolling                                     | Scroll Area                                                              |
| Notifications                                        | Toast                                                                    |
| Progress of a task                                   | Progress                                                                 |
| A measurement in a range                             | Meter                                                                    |
| A user's image with a fallback                       | Avatar                                                                   |
| Divide content                                       | Separator                                                                |

If nothing fits, build that one piece with [create-component.md](create-component.md), from the behaviors in the Core docs. Don't hand-roll it in markup.

## 2. Put the parts together

- Nest the parts as the page's Composition shows. Roots like `Popover` share state without rendering an element; others like `Tabs` render one.
- Use `render` to change a part's element, like a menu item that's a link. A custom component passed to `render` must forward its props and ref.
- For content that depends on state, pass a function as `children` (React, Solid), or use the slot props the page shows.
- Options from data: most list components take `items`, as strings or `{ value, label }` objects.
- To change a component from outside its tree, use its controller (see the Controllers page).

## 3. State

Use the default prop to start (`defaultValue`, `defaultOpen`, `defaultChecked`, `defaultPressed`). Control it only when the app needs the value:

| Framework      | Controlled value                                     | Change callback                         |
| -------------- | ---------------------------------------------------- | --------------------------------------- |
| React          | `value={value} onValueChange={setValue}`             | `onValueChange(value, details)`         |
| Vue            | `v-model="value"`, or `v-model:open` for another key | `@value-change="(value, details) => …"` |
| Svelte         | `bind:value` on `$state`                             | `onValueChange(value, details)`         |
| Solid          | `value={value()} onValueChange={setValue}`           | `onValueChange(value, details)`         |
| Web components | `element.value = …`                                  | `valuechange` event, `event.detail`     |

`details.reason` says what asked for the change (`outside-press`, `escape-key`, `item-press`…), `details.source` says how (`keyboard`, `mouse`, `agent`…), and `details.cancel()` refuses it. In web components, call `event.preventDefault()` instead. Select, Tabs and Radio report `null` when nothing is selected; multiple Select and Combobox use arrays.

## 4. Forms

- Give a control a `name` and it submits with its form, Select and Combobox included.
- Wrap controls in `Field` with `FieldLabel`, `FieldDescription` and `FieldError`. For text, put an `Input` (or `Textarea`, `NumberInput`, `PasswordInput`) inside the Field. Don't use `FieldControl` for text: it's a plain native input, so agents can't see or change it. A Checkbox, Switch, Radio Group or Select inside a Field uses the Field's label the same way; the Field page shows how each connects.
- `required`, `disabled`, `readOnly` and `form` work like native ones. For a server error, pass `invalid` to the Field and show the message in `FieldError`.

## 5. Styles

- With `web.css`, read [styles.md](styles.md) first: its tokens, the icons it draws and the sizes it sets.
- Every part has `data-slot`: the component's name on a root (`switch`), `<component>-<part>` on a part (`switch-thumb`). Read it from the rendered DOM before you write a selector, since a few differ. State shows as attributes like `data-open`, `data-pressed`, `data-disabled`, `data-side="top"`. Each component page lists its attributes and CSS variables.
- Tailwind: `data-pressed:bg-neutral-100`. CSS: `[data-slot="select-trigger"][data-open]`.
- Popups get `data-starting-style` before they enter and `data-ending-style` while they exit, and stay mounted until the exit finishes. Put exit styles on `data-ending-style`.
- Popups expose `--anchor-width`, `--available-height` and `--transform-origin`.
- `@layer ui-sdk;` goes at the top of the global stylesheet so your styles win.

## 6. Framework rules

**React.** Components work in server components; their modules already say `"use client"`. Your own file needs `"use client"` when it uses state, effects or event handlers, or calls `createParts`.

**Vue.** Props and events are kebab-case in templates (`default-value`, `@open-change`). Use `v-model` for the main value.

**Svelte.** Use `bind:` for values the parent keeps. Share state between components through `setContext` and `getContext`, created in a parent. Never put `$state` at module level: on the server it's shared across every request. Type props with an `interface Props` above `let { ... }: Props = $props()`, not an inline object type. On Svelte 5.56 or later, declare a value inside a block with a declaration tag, `{const label = $derived(labelOf(id))}`, not `{@const}`.

**Solid.** Keep reads reactive: read signals and props in JSX or a getter, never save their value in a variable first. `@ui-sdk/solid` needs Solid 2: `solid-js` and `@solidjs/web` 2.0.0-rc.14 or newer. With Vite, add `optimizeDeps: { exclude: ["@ui-sdk/core"] }` to the config, so the app and `@ui-sdk/solid` share one copy of the core in development.

**Web components.** `import "@ui-sdk/web/<name>"` defines its elements, like `<ui-select>`. Many parts wrap a native element you write, like `<ui-toggle><button>Bold</button></ui-toggle>`. A text field is `<ui-field>` with `<ui-field-label>` and `<ui-input><input /></ui-input>`; a button is `<ui-button><button>Save</button></ui-button>`. Never leave a bare `<input>` or `<button>` where an agent or a Field should see it. Read and set state through properties after the element upgrades (`await customElements.whenDefined("ui-select")`). Change events are lowercase (`valuechange`, `openchange`) and don't bubble: listen on the element, or with `{ capture: true }` on an ancestor. [web-components.md](web-components.md) covers tag names and required inner markup.

## 7. Example

A settings form in React:

```tsx
"use client"

import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@ui-sdk/react/alert-dialog"
import { Field, FieldLabel } from "@ui-sdk/react/field"
import { Input } from "@ui-sdk/react/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ui-sdk/react/select"
import { Switch, SwitchThumb } from "@ui-sdk/react/switch"

function ProjectSettings() {
  return (
    <>
      <form>
        <Field name="name">
          <FieldLabel>Project name</FieldLabel>
          <Input defaultValue="Apollo" required />
        </Field>
        <Field>
          <FieldLabel>Visibility</FieldLabel>
          <Select name="visibility" defaultValue="private">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="private">Private</SelectItem>
              <SelectItem value="internal">Internal</SelectItem>
              <SelectItem value="public">Public</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <Switch name="digest" defaultChecked>
            <SwitchThumb />
          </Switch>
          <FieldLabel>Weekly digest</FieldLabel>
        </Field>
      </form>
      <AlertDialog>
        <AlertDialogTrigger>Delete project</AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogTitle>Delete Apollo?</AlertDialogTitle>
          <AlertDialogClose>Cancel</AlertDialogClose>
          <AlertDialogClose
            value="confirm"
            data-agent-confirm="Deletes the project and all its data"
          >
            Delete forever
          </AlertDialogClose>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export { ProjectSettings }
```

Check each part name against the component pages; they're the source of truth.

## 8. Test it

Every interface gets tests, and at least the agent test from [agent-ready.md](agent-ready.md#prove-it-with-a-test). Follow [testing.md](testing.md) for the rest.
