# 0.0.8

- Fix: enforce correct semantics for Live object hierarchies
- AST changes:
  - Stop using `ObjectLiteralExpr` under `ObjectTypeDefinition`. Even though
    their syntax is literally the same, they still have different semantics when
    it comes to Live object types, so make them separate nodes.
  - Remove the `LiveObjectTypeExpr` node type. Live objects wrappers are more
    like "modifiers" of object type reference than they are a composition. The
    AST now reflects that more naturally.

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
