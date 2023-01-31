# Tools for schema validation

This repo is currently private while we're still setting up the foundational
work, but this may eventually become open source.

This repo offers:

- A private NPM package, installable via `@liveblocks/schema`

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

# Trying it locally

Make sure you have direnv installed. `parse-schema` is defined in
`bin/parse-schema`. It's a convenient wrapper that will recompile the parser any
time the parser definition is outdated modified.

```bash
$ parse-schema good.lsl
$ parse-schema bad.lsl
```
