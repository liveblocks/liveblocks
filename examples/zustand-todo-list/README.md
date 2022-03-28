<p align="center">
  <a href="https://liveblocks.io">
    <img src="https://liveblocks.io/icon-192x192.png" height="96">
  </a>
</p>

# [Liveblocks](https://liveblocks.io) × [Zustand](https://github.com/pmndrs/zustand).

This project shows how to build a collaborative to-do list with [React](https://reactjs.org/) and [Zustand](https://github.com/pmndrs/zustand).

As users edit the list, changes will be automatically persisted and synced, allowing for a list that updates in real-time across clients. Users will also be able to see who else is currently online and when a user is typing.

You can also follow our [step by step tutorial](https://liveblocks.io/docs/tutorials/multiplayer-to-do-list/react-zustand) to build it from scratch.

![todo-list-gif](https://liveblocks.io/images/docs/tutorials/todo-list/tutorial-todo-list-1.gif)

## Getting started

### Run examples locally

- Install all dependencies with `npm install`

- Create an account on [liveblocks.io](https://liveblocks.io/dashboard)

- Copy your public key from the [administration](https://liveblocks.io/dashboard/apikeys)

- Replace the constant PUBLIC_KEY in `src/store.js` with your own public key.

- Run `npm start` and go to [http://localhost:3000](http://localhost:3000)
