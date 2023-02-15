<p align="center">
  <a href="https://liveblocks.io#gh-light-mode-only">
    <img src="https://raw.githubusercontent.com/liveblocks/liveblocks/main/.github/assets/header-light.svg" alt="Liveblocks" />
  </a>
  <a href="https://liveblocks.io#gh-dark-mode-only">
    <img src="https://raw.githubusercontent.com/liveblocks/liveblocks/main/.github/assets/header-dark.svg" alt="Liveblocks" />
  </a>
</p>

# Collaborative To-do List

<p>
   <img src="https://img.shields.io/badge/-react%20native-blue?style=flat&logo=react&color=0bd&logoColor=fff" alt="React Native">
</p>

This example shows how to build a collaborative to-do list with [Liveblocks](https://liveblocks.io) and [React Native](https://reactnative.dev/).

As users edit the list, changes will be automatically persisted and synced—allowing for a list that updates in real-time across native apps. Users will also be able to see who else is currently online and when a user is typing.

<img src="https://raw.githubusercontent.com/liveblocks/liveblocks/main/.github/assets/examples/todo-list-native.png" width="536" alt="Collaborative To-do List" />

## Getting started

Run the following command to try this example locally:

```bash
npx create-liveblocks-app@latest --example react-native-todo-list --no-api-key --no-vercel
```

This will download the example and install the example. Next, you must:

- Create an account on [liveblocks.io](https://liveblocks.io/dashboard)
- Copy your **public** key from the [dashboard](https://liveblocks.io/dashboard/apikeys)
- Replace `pk_YOUR_PUBLIC_KEY` in [`liveblocks.config.ts`](./liveblocks.config.ts) with your **public** key
- For iOS, run `cd ios && pod install` then `npm run ios`
- For Android, run `npm run android`

### Manual setup

<details><summary>Read more</summary>

<p></p>

Alternatively, you can set up your project manually:

- Install all dependencies with `npm install`
- Create an account on [liveblocks.io](https://liveblocks.io/dashboard)
- Copy your **public** key from the [dashboard](https://liveblocks.io/dashboard/apikeys)
- Replace `pk_YOUR_PUBLIC_KEY` in [`liveblocks.config.ts`](./liveblocks.config.ts) with your **public** key
- For iOS, run `cd ios && pod install` then `npm run ios`
- For Android, run `npm run android`

</details>

### Deploy on Vercel

<details><summary>Read more</summary>

<p></p>

To both deploy on [Vercel](https://vercel.com), and run the example locally, use the following command:

```bash
npx create-liveblocks-app@latest --example react-native-todo-list --vercel
```

This will download the example and ask permission to open your browser, enabling you to deploy to Vercel. Next, you must:

- Create an account on [liveblocks.io](https://liveblocks.io/dashboard)
- Copy your **public** key from the [dashboard](https://liveblocks.io/dashboard/apikeys)
- Replace `pk_YOUR_PUBLIC_KEY` in [`liveblocks.config.ts`](./liveblocks.config.ts) with your **public** key
- Push a commit to update the Vercel demo with the key
- For iOS, run `cd ios && pod install` then `npm run ios`
- For Android, run `npm run android`

</details>
