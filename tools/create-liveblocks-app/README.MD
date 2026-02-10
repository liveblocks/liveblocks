<p align="center">
  <a href="https://liveblocks.io#gh-light-mode-only">
    <img src="https://raw.githubusercontent.com/liveblocks/liveblocks/main/.github/assets/header-light.svg" alt="Liveblocks" />
  </a>
  <a href="https://liveblocks.io#gh-dark-mode-only">
    <img src="https://raw.githubusercontent.com/liveblocks/liveblocks/main/.github/assets/header-dark.svg" alt="Liveblocks" />
  </a>
</p>

# `create-liveblocks-app`

The easiest way to get started with a Liveblocks starter kit or example.

## Get started

You can create a new Liveblocks project using the following command:

```
npx create-liveblocks-app@latest
```

The initial prompt allows you to set up one of the following:

1. [Next.js Starter kit](https://liveblocks.io/starter-kit)—Our official starter
   kit for Next.js
2. [An example from the Liveblocks repo](https://github.com/liveblocks/liveblocks/tree/main/examples)—Any
   example from `liveblocks/liveblocks`

From there, follow the instructions to set up your app! You can also use the CLI
to generate a `liveblocks.config.(js|ts)` config file.

### Flags (optional)

If you wish, you can skip certain `create-liveblocks-app` prompts with the
following flags. Please note that these are optional, and if no flags are used,
you will be prompted about these options in the installer instead.

```
npx create-liveblocks-app@latest [options]

Options:

  --init
  Generate a liveblocks.config.(js|ts) file in the current directory

  --framework [`react`|`javascript`]
  The framework your config file uses. Option only for `--init`.
  e.g. `--framework react`

  --next
  Use the Next.js Starter Kit

  --example [example name]
  Use a Liveblocks example, the name corresponding to the example name in the repo
  e.g. `--example zustand-whiteboard` for https://github.com/liveblocks/liveblocks/tree/main/examples/zustand-whiteboard

  --name [repo name]
  The name of the project/directory
  e.g. `--name my-liveblocks-project`

  --package-manager [`npm`|`yarn`|`pnpm`]
  Select your package manager, default is `npm`
  e.g `--package-manager yarn`

  --auth [`demo`|`github`|`auth0`]
  Select your authentication method. Option only for Next.js Starter Kit.
  e.g. `--auth github`

  --install
  Install the project with the selected package manager

  --no-install
  Don't install the project

  --git
  Initialize git

  --no-git
  Don't initialize git

  --vercel
  Deploy on Vercel, and get Liveblocks API key

  --no-vercel
  Don't deploy on Vercel

  --api-key
  Get Liveblocks API key. Ignored if `--vercel` is used.

  --no-api-key
  Don't get Liveblocks API key. Ignored if `--vercel` is used.

  --open
  Open browser without asking permission, when deploying to Vercel or getting API key

  --help
  Find more info
```

#### Examples

Next.js Starter Kit with no install:

```
npx create-liveblocks-app@latest --next --no-install
```

Example from Liveblocks repo with directory/project name specified:

```
npx create-liveblocks-app@latest --example nextjs-live-avatars --name my-liveblocks-app
```

Next.js Starter Kit with every option:

```
npx create-liveblocks-app@latest --next --name my-project --auth github --package-manager npm --install --git  --vercel --open
```

Generate a Liveblocks config file:

```
npx create-liveblocks-app@latest --init
```
