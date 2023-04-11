# Liveblocks schema language

This subsection of the repo is where the Liveblocks schema
language is developed and maintained.

- [`liveblocks-schema`](./schema-lang/liveblocks-schema) - the parser and the type checker for the Liveblocks schema language
- [`infer-schema`](./schema-lang/infer-schema) - an experimental library to help generate schema definitions from existing room data
- [`codemirror-language`](./schema-lang/codemirror-language) the definition of the language for use in CodeMirror.

# Architecture

```mermaid
flowchart LR
  subgraph npm run build
    build:ast
    build:parser
  end

  ast/ast.grammar --> build:ast[npm run build:ast] ==>|generates| ast/index.ts
  parser/schema.pegjs --> build:parser[npm run build:parser] ==>|generates| parser/generated-parser.ts

  parser/generated-parser.ts -.-> parser
  ast/index.ts -.-> parser
  ast/index.ts -.-> checker
  ast/index.ts -.-> prettifier
  ast/index.ts -.-> typescript-generator
  ast/index.ts -.-> schema-generator

  subgraph TODO
    typescript-generator
    schema-generator
  end
```
