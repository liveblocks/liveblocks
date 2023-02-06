# Liveblocks schema language

This repo is currently private while we're still setting up the foundational
work, but this may eventually become open source.

This monorepo consists of two subprojects:

- [`liveblocks-schema`](./packages/liveblocks-schema) - the source of the main
  `@liveblocks/schema` package
- [`ast-generator`](./packages/ast-generator) - an internal build tool

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
