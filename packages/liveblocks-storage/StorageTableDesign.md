Alternative 2 still seems the best option so far, especially if we can somehow
use use auto-incrementing ideas for all objects on the server.

Suppose we have this structure:

```ts
{
  "foo": "bar",
  "animals": new LiveList([
    new LiveObject({ emoji: "🦊", name: "Fox" }),
    new LiveObject({ emoji: "🦍", name: "Gorilla" }),
    { emoji: "🐟", name: "Fish" },
  ])
}
```

### Alternative 1

Two ways to persist this. Currently (aka Storage V1) we do:

| nodeId | type         | parentId | parentKey | data                             |
| ------ | ------------ | -------- | --------- | -------------------------------- |
| "root" | LiveObject   | -        | -         | { "foo": "bar" }                 |
| "0:1"  | LiveList     | "root"   | "animals" | -                                |
| "0:2"  | LiveObject   | "0:1"    | "$1"      | { emoji: "🦊", name: "Fox" }     |
| "0:3"  | LiveObject   | "0:1"    | "$2"      | { emoji: "🦍", name: "Gorilla" } |
| "0:4"  | LiveRegister | "0:1"    | "$3"      | { emoji: "🐟", name: "Fish" }    |

Primary key: `(nodeId)`  
Unique key: `(parentId, parentKey)`

**Pros:**

- Each node has only one entry (no repetition of node IDs)
- It's obvious what type a node is

**Cons:**

- Size of `data` column is limited (has a max size)
- When `name: "Gorilla"` is changed to `name: "Monkey"`, the delta will contain
  the full object, or we'll have to make the delta logic a lot more complicated
- These fields cannot be versioned

### Alternative 2

Another way to store this is in a table where we duplicate the node ID for every
entry in it.

| nodeId | key       | value                         | ref (uniq) |
| ------ | --------- | ----------------------------- | ---------- |
| "root" | "foo"     | "bar"                         | -          |
| "root" | "animals" | -                             | "L0:1"     |
| "L0:1" | "$1"      | -                             | "O0:2"     |
| "L0:1" | "$2"      | -                             | "O0:3"     |
| "L0:1" | "$3"      | { emoji: "🐟", name: "Fish" } | -          |
| "O0:2" | "emoji"   | "🦊"                          | -          |
| "O0:2" | "name"    | "Fox"                         | -          |
| "O0:3" | "emoji"   | "🦍"                          | -          |
| "O0:3" | "name"    | "Gorilla"                     | -          |

Primary key: `(nodeId, key)`  
Unique key: `(ref)`

Here, the `ref` column gets a UNIQUE index, to avoid accidentally having two
positions in the tree to point to the same object.

Also, we adopt a naming convention so we can see from the node ID what type of
node it is instantly. "L0:1" means LiveList 0:1, "O0:2" means LiveObject 0:2,
etc.

Pros:

- It's obvious what type a node is from its prefix
- When `name: "Gorilla"` is changed to `name: "Monkey"`, the delta is trivial to
  compute
- No need to store LiveRegisters

Cons:

- Each node has potentially many rows (lots of repetition of nodeId)

### Alternative 3

This one is more complicated, but tries to combine the best of both worlds from
these two solutions:

| nodeId | type         | parentId | parentKey | extra (uniq) | value                         |
| ------ | ------------ | -------- | --------- | ------------ | ----------------------------- |
| "root" | LiveObject   | -        | -         | 1            | -                             |
| "0:1"  | LiveList     | "root"   | "animals" | -            | -                             |
| "0:2"  | LiveObject   | "0:1"    | "$1"      | 3            | -                             |
| "0:3"  | LiveObject   | "0:1"    | "$2"      | 4            | -                             |
| "0:4"  | LiveRegister | "0:1"    | "$3"      | -            | { emoji: "🐟", name: "Fish" } |

Primary key: `(nodeId)`  
Unique key: `(parentId, parentKey)` Unique key: `(extra)`

| extraId | key     | value     |
| ------- | ------- | --------- |
| 1       | "foo"   | "bar"     |
| 3       | "emoji" | "🦊"      |
| 3       | "name"  | "Fox"     |
| 4       | "emoji" | "🦍"      |
| 4       | "name"  | "Gorilla" |

Primary key: `(extraId, key)`

**Pros:**

- Deltas and versioning still simple and minimal.

**Cons:**

- More complex, needs two tables
- LiveRegister still needed as a type
- `value` column only used for LiveRegister
- Requires multi-row/multi-table checking for field name presence.

### Alternative 4

- Have a separate table for every LiveObject, LiveMap, etc.

<!--

### Thought experiments

On this table, support a user mutates:

    root.set("animals", 123)

In alt 3, we must do:

- Find
  `SELECT node_id, extra_id FROM nodes WHERE parentId = 'root' AND parentKey = 'animals'`
  → 0:1
- Delete entire tree for 0:1

-->
