# Web components

What the `@ui-sdk/web` types don't say, learned by probing.

## Setup

- Install `@ui-sdk/web` at the same version as `@ui-sdk/core` if it's missing.
- There's no `primitive` entry. `createParts`, `wrappedButton` and the element types, like `UiInputElement`, come from `@ui-sdk/web` itself.
- A component entry, like `@ui-sdk/web/input`, defines its elements when imported. It also exports the component's types and its controller factory when it has one, like `createInputController`. A `define…Elements()` function you may find in another `.d.ts` isn't what the entry exports, and calling it fails.

## Without a bundler

A plain HTML page, like an Artifact, loads our elements and their default styles with two tags in its `<head>`:

```html
<script type="module" src="https://ui-sdk.dev/web.js"></script>
<link rel="stylesheet" href="https://ui-sdk.dev/web.css" />
```

Read https://ui-sdk.dev/web.md first: the web components docs in one file, for a page like this. `web.js` defines each element the first time its tag appears, so leave out imports that only define elements, like `import "@ui-sdk/web/popover"`. What an entry exports comes from its own file, like `createPopoverController` from `https://ui-sdk.dev/web/popover.js`. To build elements of your own, import the behaviors, `definePrimitive` and `createParts` from `https://ui-sdk.dev/web/core.js`. It has everything in `@ui-sdk/core`'s root, but not subpaths like `@ui-sdk/core/tabs` or helpers like `toast()`. Use the `/web/` paths with `web.js` and the `/web@0/` paths with `web@0.js`, so the page loads one release.

## Tag names and markup

Each component's page, like `node_modules/@ui-sdk/web/docs/components/input.md`, shows its tags and markup. `node_modules/@ui-sdk/web/custom-elements.json` lists every tag each entry defines, with its attributes and their types, properties, the controller's methods on `.api`, events, parts and data attributes. Search it for a tag, like `"tagName": "ui-input-group"`, before probing. To confirm what an entry defines, probe it:

```ts
import "@ui-sdk/web/input"
for (const tag of ["ui-input", "ui-input-group", "ui-input-clear"])
  console.log(tag, !!customElements.get(tag))
```

Parts that keep native behavior need the native element inside them. The console says which: `<ui-input> needs its native element inside it for "root"`. For example:

```html
<ui-input-group>
  <ui-input><input aria-label="Search" /></ui-input>
  <ui-input-clear><button aria-label="Clear">×</button></ui-input-clear>
</ui-input-group>
```

## Elements of your own

`createParts` reads attributes and properties from the primitive's `options` schema, so give `definePrimitive` one, like `options: { clearOnEscape: "boolean", input: "value" }`. Every attribute option gets a property that reflects it, like `el.clearOnEscape = true`. Name booleans that start on in the root's `defaults`, like `defaults: { loop: true }`, so the property reads `true` without the attribute. Options the page provides go in the root's `options`:

```ts
createParts(clearableInput, {
  root: {
    tag: "ui-clearable-input",
    display: "block",
    // Read lazily: elements inside may upgrade after this one.
    options: (el) => ({
      input: () => el.querySelector<UiInputElement>("ui-input")?.api,
    }),
  },
})
```

- Our elements expose their controller as `.api` and may not take a `controller` property, unlike their React components. If your primitive drives one of ours through a controller, take the controller as an option (a function, read when needed), so React can pass its own and web components can pass `.api`.
- Don't bind a slot of yours to a native element one of ours binds. Both roots would write `data-slot` to it. Listen from a wrapper slot instead.

## Differences from React

- **Parts that aren't present stay in written markup, with `hidden`.** React removes them. A test helper that checks presence should treat `hidden` as absent.
- **Changes fire events,** like `valuechange` on `<ui-input>`, with `{ value, reason }` in `detail`. `preventDefault()` cancels the change.
- **Rendering custom elements from React JSX** needs their tags in `React.JSX.IntrinsicElements`. Don't name the props type `Element` inside `namespace JSX`: it shadows `JSX.Element`.

## Testing

Import the module that defines your elements in `beforeAll`, mount markup with `innerHTML`, and wait a tick before asserting, since parts register and sync after they connect. Dispatch real events with `bubbles: true`:

```ts
const event = new KeyboardEvent("keydown", {
  key: "Escape",
  bubbles: true,
  cancelable: true,
})
field.dispatchEvent(event)
```
