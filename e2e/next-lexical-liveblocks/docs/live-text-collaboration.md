# Lexical + LiveText collaboration

Collaborative Lexical via Liveblocks Storage (`LiveObject`, `LiveList`,
`LiveText`).

- **`kind`** — how a node is stored/synced (fixed union)
- **`type`** — Lexical node type string (open, e.g. `"paragraph"`, `"heading"`)
- No persisted Lexical keys — identity is Storage CRDT + list index; session
  `WeakMap` binding

## Storage schema

`document` is the root node (maps to Lexical `$getRoot()`).

```typescript
declare global {
  interface Liveblocks {
    Storage: {
      document: LiveObject<{
        kind: "root";
        type: "root";
        version: number;
        children: LiveList<LiveNode>;
      }>;
    };
  }
}

type LiveElementNode = LiveObject<{
  kind: "element";
  type: string;
  version: number;
  children: LiveList<LiveNode>;
  props?: JsonObject;
}>;

type LiveTextNode = LiveObject<{
  kind: "text";
  type: string;
  version: number;
  content: LiveText;
  props?: JsonObject;
}>;

type LiveDecoratorNode = LiveObject<{
  kind: "decorator";
  type: string;
  version: number;
  props?: JsonObject;
  slots?: LiveObject<Record<string, LiveNode>>;
}>;

type LiveLineBreakNode = LiveObject<{
  kind: "linebreak";
  type: "linebreak";
  version: number;
}>;

type LiveNode =
  | LiveElementNode
  | LiveTextNode
  | LiveDecoratorNode
  | LiveLineBreakNode;
```

| `kind`      | Sync channel                   |
| ----------- | ------------------------------ |
| `root`      | `children: LiveList`           |
| `element`   | `children: LiveList` + `props` |
| `text`      | `content: LiveText`            |
| `decorator` | `props` + optional `slots`     |
| `linebreak` | list presence only             |

## Example

Lexical tree:

```
Root
 └── Paragraph (type: "paragraph")
      ├── TextNode "Hello " (bold)
      └── TextNode "world"
```

Storage (JSON view):

```json
{
  "document": {
    "kind": "root",
    "type": "root",
    "version": 1,
    "children": [
      {
        "kind": "element",
        "type": "paragraph",
        "version": 1,
        "children": [
          {
            "kind": "text",
            "type": "text",
            "version": 1,
            "content": [["Hello ", { "bold": true }], ["world"]]
          }
        ]
      }
    ]
  }
}
```
