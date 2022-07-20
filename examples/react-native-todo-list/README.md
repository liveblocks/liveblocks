<p align="center">
  <a href="https://liveblocks.io">
    <img src="https://raw.githubusercontent.com/liveblocks/liveblocks/main/.github/assets/header.svg" alt="Liveblocks" />
  </a>
</p>

# To-do List

<p>
   <img src="https://img.shields.io/badge/-react%20native-blue?style=flat&logo=react&color=0bd&logoColor=fff" alt="React Native">
</p>

This example shows how to build a collaborative to-do list with [Liveblocks](https://liveblocks.io) and [React Native](https://reactnative.dev/).

As users edit the list, changes will be automatically persisted and synced—allowing for a list that updates in real-time across native apps. Users will also be able to see who else is currently online and when a user is typing.

<img src="https://raw.githubusercontent.com/liveblocks/liveblocks/main/.github/assets/examples/todo-list-native.png" width="500" alt="To-do List" />

## Getting started

- Install all dependencies with `npm install`
- Create an account on [liveblocks.io](https://liveblocks.io/dashboard)
- Copy your **public** key from the [dashboard](https://liveblocks.io/dashboard/apikeys)
- Replace `pk_YOUR_PUBLIC_KEY` in [`liveblocks.config.ts`](./liveblocks.config.ts) by your **public** key
- For iOS run `ios\pod install` and `npx react-native run-ios`
- For Android run `npx react-native run-android`

### Guides

Follow our [guides](https://liveblocks.io/docs/guides/react-native) to discover Liveblocks specifications for React Native.
