<p align="center">
  <a href="https://liveblocks.io">
    <img src="https://raw.githubusercontent.com/liveblocks/liveblocks/main/.github/assets/header.svg" alt="Liveblocks" />
  </a>
</p>

# Examples

This directory contains all collaborative examples showcased on
[liveblocks.io/examples](https://liveblocks.io/examples).

## Using the examples

All examples are their own local packages. They don't depend on anything else in
this monorepo. As such, you can just run `npm install` and `npm run dev` in any
of them to try them out. Don’t forget to check out the individual example
READMEs for instructions on how to set up your Liveblocks keys.

## Linking examples to the _local_ Liveblocks packages

If you are contributing to one of the core Liveblocks packages and want to try
your changes against any of the examples, take the following steps:

1. Declare the example as an NPM workspace, in the `package.json` in the root of
   the monorepo:
   ```js
   {
     "workspaces": [
       "shared/*",
       "packages/*",
       "e2e/next-sandbox",
       "examples/whatever-example",  // 👈
     ]
   }
   ```
1. Run `npm install` from the root of this monorepo.
1. Run `turbo run build` in the root of this monorepo.
1. Now the example is linked to the local Liveblocks source code.
1. Remember to NOT (!) check in the changes to the `package.json` files. It’s
   fine to develop against a locally linked package, but we want to keep the
   examples linked against _published_ versions of Liveblocks at all times.
