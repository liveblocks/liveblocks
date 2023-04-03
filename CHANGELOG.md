# 0.0.13-beta3

- Add support for literal types (e.g. `"hi"`, `'hey'`, `42`, `-1`, or `true`)
- Add more suggested linter actions
- Fix: allow mixing normal objects and LiveObjects in a union

# 0.0.12

- Add support for union types: `X | Y | Z`

# 0.0.11

- Make all built-in types lowercased, following TypeScript syntax more closely
  instead of GraphQLs:
  - `String` → `string`
  - `Float` → `number`
  - `Boolean` → `boolean`
  - Removed `Int` type. It will get reintroduced later in a better way.
  - Added a new `null` type. (It's not super useful yet, because there is no
    union construct yet, but that will be added soon.)
- Added parser option to parser to still allow legacy built-ins (to be able to
  parse existing valid schemas created before this breaking change)
- The following AST nodes have been renamed:
  - `ArrayExpr` -> `ArrayType`
  - `BuiltInScalar` -> `ScalarType`
  - `LiveListExpr` -> `LiveListType`
  - `LiveMapExpr` -> `LiveMapType`
  - `ObjectLiteralExpr` -> `ObjectLiteralType`
  - `TypeExpr` -> `Type`
- Add CodeMirror integration

# 0.0.10

- Add support for `LiveList` types (e.g. `LiveList<Todo>`)
- Add support for `LiveMap` types (e.g. `LiveMap<String, Todo>`)
- Add support for array types (e.g. `String[]`, `Int[][]`, etc)
- Add new top-level API for diagnostic reporting `getDiagnostics(schemaText)`,
  useful in text editors and IDEs that don't need the parse result, just the
  diagnostic error information (if any).
- Fix: parser now correctly rejects keywords used in type name positions, e.g.
  `LiveObject<LiveObject>`

# 0.0.9

- Add `@liveblocks/infer-schema`, a library to help inferring a schema from
  existing room data
- `ObjectTypeDefinition` nodes now store an `isStatic` property. When `true`, it
  means it is only usable in JSON contexts. When `false` (= default) it means
  the object is only usable in Live contexts.
- Disallows object type definitions to be used in hybrid contexts. Given a type
  definition of `type Foo {}`, then either all references to `Foo` must be
  `'Foo'` or all references must be `'LiveObject<Foo>`, but no mixing is
  allowed. (Consequence of now having `isStatic` at the object type definition
  level.)
- Expose all Definitions in `CheckedDocument`, not just the root
- Expose access to the raw AST via `CheckedDocument.ast`
- Fix: disallow `liveblocksType` as an identifier
- Fix: some ugly error messages making incorrect suggestions
- Fix: tweak error message for circular references
- Fix: record range info on built-ins

# 0.0.8

- Cleaner and more consistent error messages
- Fix: enforce correct semantics for Live object hierarchies
- Fix: fail on unused type definitions
- AST changes:
  - Stop using `ObjectLiteralExpr` under `ObjectTypeDefinition`. Even though
    their syntax is literally the same, they still have different semantics when
    it comes to Live object types, so make them separate nodes.
  - Remove the `LiveObjectTypeExpr` node type. Live objects wrappers are more
    like "modifiers" of object type reference than they are a composition. The
    AST now reflects that more naturally.
  - Fix: remove `dummy` fields on built-in scalar type nodes (no longer needed)
- Improved unit test ergonomics
  - Allow multiple test cases per file (for more natural grouping)
  - Use inline error annotations to assert error messages

# 0.0.7

- Add `Boolean` built-in scalar type
- Fix: differentiate between Identifier and TypeName nodes
- Fix: don't allow illegal ref cycles (forever) + also don't allow legal ref
  cycles (for now, see
  [rationale](https://github.com/liveblocks/liveblocks.io/issues/910))
- Fix: identifiers must start with letter or `_`
- Fix: type names must start with uppercase letter or `_`
- Fix: improved error suggestions when misspelling built-ins
- Fix various other small bugs in the parser/checker
- Massively improved unit test foundation
- AST grammar cleanups
  - `{String,Int,Float,Boolean}Keyword` → `{String,Int,Float,Boolean}StringType`
  - `ObjectTypeDef` → `ObjectTypeDefinition`
  - Remove `LiveTypeExpr` grouping level
- Don't retain comments as part of the AST (might be added back in later)
- Fix for non-node envs (missing `process` global)

# 0.0.6

- Make built-in types their own separate AST nodes
- Strip runtime type checks in AST constructors in production builds

# 0.0.1 - 0.0.5

Initial parser version.
