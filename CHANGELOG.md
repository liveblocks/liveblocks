# 0.0.7

- Add `Boolean` built-in scalar type
- Fix: differentiate between Identifier and TypeName nodes
- Fix: don't allow illegal ref cycles
- Fix: identifiers must start with letter or `_`
- Fix: type names must start with uppercase letter or `_`
- Fix: improved error suggestions when misspelling built-ins
- Fix various other small bugs in the parser/checker
- Massively improved unit test foundation
- Don't retain comments as part of the AST (might be added back in later)
- Fix for non-node envs (missing `process` global)

# 0.0.6

- Make built-in types their own separate AST nodes
- Strip runtime type checks in AST constructors in production builds

# 0.0.1 - 0.0.5

Initial parser version.
