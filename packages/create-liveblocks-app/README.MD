<p align="center">
  <a href="https://liveblocks.io">
    <img src="https://raw.githubusercontent.com/liveblocks/liveblocks/main/.github/assets/header.svg" alt="Liveblocks" />
  </a>
</p>

# `create-liveblocks-app` (beta)

The easiest way to get started with a Liveblocks starter kit or example. 

### Dev
Build changes on every save:

```shell
npm run dev
```

### Build
Build a single time:

```shell
npm run build
```

### Demo
Run a demo with no flags
```shell
npm run demo
```

### Use flags

Enter the `/.demo` folder with a command line and run the following, with your flags on the end:

```
node ../dist/index.js
```

#### Examples
Next.js Starter Kit with no install:
```
node ../dist/index.js --next --skip-install
```

Example from Liveblocks repo with directory/project name specified:
```
node ../dist/index.js --example nextjs-live-avatars --name my-liveblocks-app
```
