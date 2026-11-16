# Style it

Components render no styles of their own. `@ui-sdk/core/web.css` is an optional stylesheet that gives every component a default look. The setup prompt imports it, so most apps start with it.

## web.css

- Everything in it sits in `@layer ui-sdk`, so any rule outside a layer wins. With Tailwind, don't import it from a script: Tailwind's base styles reset it. Import it in the global stylesheet after Tailwind, with `@import "@ui-sdk/core/web.css" layer(components);`. That nests it as `components.ui-sdk`, above the base styles and below the utilities, while ui-sdk's behavior CSS stays in the top-level `ui-sdk` layer.
- Work one of two ways: theme it by setting its `--ui-*` tokens on `:root`, or restyle a part with your own CSS on top. Don't fight it with `!important`.
- It sets `color-scheme: light dark` and writes colors with `light-dark()`, so it follows the system theme. A light-only design sets `color-scheme: light` on `:root`.
- Read `node_modules/@ui-sdk/core/dist/web.css`, or https://ui-sdk.dev/web.css on a page with no build step, when a part looks wrong. It's the only place its sizes and icons are written down.

### Tokens

| Token                                                                                                        | What it drives                                                                          |
| ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| `--ui-background`, `--ui-foreground`                                                                         | Page, field and popup surfaces, and their text                                          |
| `--ui-muted`, `--ui-muted-foreground`                                                                        | Hover and selected fills; hints, placeholders and secondary text                        |
| `--ui-border`                                                                                                | Dividers and popup edges                                                                |
| `--ui-input`                                                                                                 | Borders of inputs, selects, checkboxes, buttons and the empty part of a track or rating |
| `--ui-primary`, `--ui-primary-foreground`                                                                    | Checked, pressed and filled states, and the text on them                                |
| `--ui-destructive`                                                                                           | Errors and invalid borders                                                              |
| `--ui-ring`, `--ui-ring-border`                                                                              | The focus outline, and a field's border while it has focus                              |
| `--ui-overlay`, `--ui-shadow`                                                                                | A modal's backdrop, and popup shadows                                                   |
| `--ui-radius`                                                                                                | Corners. Above 0, switch and slider thumbs turn fully round                             |
| `--ui-spacing`                                                                                               | The unit every height, padding and gap is a multiple of                                 |
| `--ui-font-size`, `--ui-line-height`                                                                         | Control text                                                                            |
| `--ui-font-sans`, `--ui-font-mono`                                                                           | Fonts                                                                                   |
| `--ui-icon-chevron`, `-check`, `-minus`, `-plus`, `-x`, `-eye`, `-eye-off`, `-calendar`, `-pipette`, `-star` | The default icons below, as `url()` images used as masks                                |

### Icons it draws

These parts draw an icon in `::before` or `::after` unless they hold an `<svg>` of their own. A text glyph like `−` doesn't count, so you get two. Either render an `<svg>`, keep the default, swap it through its `--ui-icon-*` token, or set `content: none`.

- Chevrons: `select-trigger`, `combobox-trigger`, `navigation-menu-trigger`, `accordion-trigger`, `collapsible-trigger`, a submenu's `menu-trigger`.
- Checks: `checkbox-indicator` (a minus while indeterminate), `select-item-indicator`, `combobox-item-indicator`, `listbox-item-indicator`, `menu-item-indicator`.
- Minus and plus: `number-input-decrement`, `number-input-increment`.
- Others: `calendar-previous` and `-next`, `carousel-previous` and `-next`, `pagination-previous` and `-next`, `tree-indicator`, `password-input-toggle`, `date-picker-trigger`, `date-picker-clear`, `color-picker-eye-dropper`, `file-input-item-remove`, `token-input-token-remove`, `toast-close`, `otp-input-separator`.
- `rating-item` draws its star in `::before`. Draw your own star on the item, not on its radio, which is a transparent hit area.

### Sizes it sets

Reset these when a design needs other sizes:

- Buttons, triggers, inputs and select triggers: `height: calc(var(--ui-spacing) * 8)`. Set `height: auto` for a taller one.
- Textarea: `min-height: calc(var(--ui-spacing) * 20)`.
- Slider, Progress and Meter: `min-width: 12rem`.
- Accordion, Carousel and Image Cropper: `max-width: 28rem`. Carousel is also a three-column grid.
- `resizable-panel`: `padding: calc(var(--ui-spacing) * 4)`.
- `field`: a column. A checkbox beside its label inside a Field needs `flex-direction: row`.
- A button with `aria-label` and only an `<svg>` inside is sized as a square icon button. Don't put `aria-label` on a button with visible text: its name should be that text.

## Slots

- A root's `data-slot` is the component's name, like `switch`, `slider` or `button`. A part's is `<component>-<part>`, like `switch-thumb` or `select-trigger`.
- Some don't follow that, like a submenu's trigger, which is `menu-trigger`, and a part rendered as another component through `render`, which can carry that component's slot. Read the slot from the rendered DOM before you write a selector.

## State

- Style `data-selected`, `data-highlighted`, `data-checked` and the rest so the state reads on its own, at 3:1 against what's around it: a fill change, a full outline or a weight change. A faint tint alone doesn't. Don't default to a stripe down one edge.

## Color

- Text needs 4.5:1 against what's behind it, and 3:1 when it's large (WCAG 1.4.3). That includes placeholders, `::before` and `::after` text, and text over gradients or images.
- Control edges, focus indicators and state fills need 3:1 (WCAG 1.4.11).
- When you set tokens, check these pairs: `--ui-foreground` on `--ui-background`; `--ui-muted-foreground` on `--ui-background` and on `--ui-muted`; `--ui-primary-foreground` on `--ui-primary`; `--ui-input`, `--ui-ring` and `--ui-ring-border` on `--ui-background`.
- jsdom can't measure color. Check contrast in a real browser, as [testing.md](testing.md#contrast) says.
