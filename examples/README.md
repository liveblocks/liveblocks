# Using the examples

All examples are their own local packages. They don't depend on anything else in
this monorepo. As such, you can just run `npm install` and `npm run dev` in any
of them to try them out. Don’t forget to check out the individual example
READMEs for instructions on how to set up your Liveblocks keys.

# Linking examples to the _local_ Liveblocks packages

If you are contributing to one of the core Liveblocks packages and want to try
your changes against any of the examples, take the following steps:

1. Give the example project a name, scoped to `@liveblocks`
2. Make it private
3. Change the dependency version in `examples/whatever-example/package.json` to
   `"*"` instead of an explicit version number:
   ```json
   {
     "name": "@liveblocks/whatever-example",  👈 (1)
     "private": true,                         👈 (2)
     "dependencies": {
       "@liveblocks/client": "*",             👈 (3)
       "@liveblocks/node": "*",               👈 (3)
       "@liveblocks/react": "*",              👈 (3)
       ...
     }
   }
   ```
4. Declare the example as an NPM workspace, in the `package.json` in the root of
   the monorepo:
   ```json
   {
     "workspaces": [
       "shared/*",
       "packages/*",
       "e2e/next-sandbox",
       "examples/whatever-example",  👈 (4)
     ]
   }
   ```
5. Run `npm install` from the root of this monorepo.
6. Run `turbo run build` in the root of this monorepo.
7. Now the example is linked to the local Liveblocks source code.
8. Remember to NOT (!) check in the changes to the `package.json` files. It’s
   fine to develop against a locally linked package, but we want to keep the
   examples linked against _published_ versions of Liveblocks at all times.
