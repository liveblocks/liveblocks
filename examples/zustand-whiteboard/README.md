<p align="center">
  <a href="https://liveblocks.io">
    <img src="https://raw.githubusercontent.com/liveblocks/liveblocks/main/.github/assets/header.svg" alt="Liveblocks" />
  </a>
</p>

<br/>

# Whiteboard

<p>
  <a href="https://codesandbox.io/s/github/liveblocks/liveblocks/tree/main/examples/zustand-whiteboard">
    <img src="https://img.shields.io/badge/open%20in%20codesandbox-message?style=flat&logo=codesandbox&color=333&logoColor=fff" alt="Open in CodeSandbox" />
  </a>
  <img src="https://img.shields.io/badge/react-message?style=flat&logo=react&color=0bd&logoColor=fff" alt="React" />
  <img src="https://img.shields.io/badge/zustand-message?style=flat&color=e47" alt="Zustand" />
</p>

This example shows how to build a collaborative whiteboard with [Liveblocks](https://liveblocks.io), [React](https://reactjs.org/) and [Zustand](https://github.com/pmndrs/zustand).

![Whiteboard](.github/assets/examples/whiteboard.png)

## Getting started

- Install all dependencies with `npm install`
- Create an account on [liveblocks.io](https://liveblocks.io/dashboard)
- Copy your **public** key from the [dashboard](https://liveblocks.io/dashboard/apikeys)
- Replace `PUBLIC_KEY` in [`store.js`](./examples/zustand-whiteboard/src/store.js) by your **public** key
- Run `npm run start` and go to [http://localhost:3000](http://localhost:3000)

### Tutorial

Follow our [step by step tutorial](https://liveblocks.io/docs/tutorials/collaborative-online-whiteboard/react-zustand) to build it from scratch.
