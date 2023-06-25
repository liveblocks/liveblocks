<p align="center">
  <a href="https://liveblocks.io#gh-light-mode-only">
    <img src="https://raw.githubusercontent.com/liveblocks/liveblocks/main/.github/assets/header-light.svg" alt="Liveblocks" />
  </a>
  <a href="https://liveblocks.io#gh-dark-mode-only">
    <img src="https://raw.githubusercontent.com/liveblocks/liveblocks/main/.github/assets/header-dark.svg" alt="Liveblocks" />
  </a>
</p>

# Liveblocks schema language

This subsection of the repo is where the Liveblocks schema
language is developed and maintained.

- [`liveblocks-schema`](./liveblocks-schema) - the parser and the type checker for the Liveblocks schema language
- [`infer-schema`](./infer-schema) - an experimental library to help generate schema definitions from existing room data
- [`codemirror-language`](./codemirror-language) the definition of the language for use in CodeMirror.

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
  ast/index.ts -.-> infer-schema

  subgraph TODO
    typescript-generator
    infer-schema
  end
```
