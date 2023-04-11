# Internals

This document explains roughly how schema inference works internally. The
inference happens in 3 steps:

## PlainLson -> inferred type (inferStorageType)

As a first step, we traverse the plain LSON tree assigning each node a
corresponding inferred type that matches the value with the most specific
inferred type possible (no fields optional, integers will be given the
"Integer" > "Float" type, etc.). In this step, we also assign all nodes possibly
names based upon where in the tree they are positioned (mainly based upon the
parent field names).

## Inferred type -> inferred schema (buildSchema)

This is where the magic happens. First, we extract all object (=root) types and
pick a name from the assigned ones, picking the one with the highest score
first. Then, if another root type with the same name already exists, we try to
merge them by creating the strictest inferred type that matches both values. If
this isn't possible (= would require a union type), we repeat this process until
no possible names are left. In this case, we use the name with the highest score
and add a suffix until no conflict exists.

We'll expand on this approach in the future by merging identical types, etc.

## Inferred schema -> AST (inferredSchemaToAst)

Simple 1:1 conversion from the inferred schema types to ast definitions. We use
this generated AST to generate the schema text.
