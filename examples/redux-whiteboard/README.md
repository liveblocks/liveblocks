<p align="center">
  <a href="https://liveblocks.io">
    <img src="https://raw.githubusercontent.com/liveblocks/liveblocks/main/.github/assets/header.svg" alt="Liveblocks" />
  </a>
</p>

# Whiteboard

<p>
  <a href="https://codesandbox.io/s/github/liveblocks/liveblocks/tree/main/examples/redux-whiteboard">
    <img src="https://img.shields.io/badge/open%20in%20codesandbox-message?style=flat&logo=codesandbox&color=333&logoColor=fff" alt="Open in CodeSandbox" />
  </a>
  <img src="https://img.shields.io/badge/react-message?style=flat&logo=react&color=0bd&logoColor=fff" alt="React" />
  <img src="https://img.shields.io/badge/redux-message?style=flat&logo=redux&color=74b&logoColor=fff" alt="Redux" />
</p>

This example shows how to build a collaborative whiteboard with
[Liveblocks](https://liveblocks.io), [React](https://reactjs.org/) and
[Redux](https://redux-toolkit.js.org/).

<img src="https://raw.githubusercontent.com/liveblocks/liveblocks/main/.github/assets/examples/whiteboard.png" width="500" alt="Whiteboard" />

## Getting started

- Install all dependencies with `npm install`
- Create an account on [liveblocks.io](https://liveblocks.io/dashboard)
- Copy your **public** key from the
  [dashboard](https://liveblocks.io/dashboard/apikeys)
- Replace `pk_YOUR_PUBLIC_KEY` in
  [`store.js`](./examples/redux-whiteboard/src/store.js) by your **public** key
- Run `npm run start` and go to [http://localhost:3000](http://localhost:3000)

### Tutorial

Follow our
[step by step tutorial](https://liveblocks.io/docs/tutorials/collaborative-online-whiteboard/react-redux)
to build it from scratch.
