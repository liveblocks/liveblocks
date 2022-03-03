<p align="center">
  <a href="https://liveblocks.io">
    <img src="https://liveblocks.io/icon-192x192.png" height="96">
  </a>
</p>

# [Liveblocks](https://liveblocks.io) × [Next.js](https://nextjs.org/). × [Redux Toolkit](https://redux-toolkit.js.org/).

This repo shows how to use Liveblocks with [Next.js](https://nextjs.org/) and [Redux Toolkit](https://redux-toolkit.js.org/).

![todo-list-screenshot](https://liveblocks.io/_next/image?url=%2Fimages%2Fexamples%2Fthumbnail-todo-list.png&w=1200&q=90)

## Getting started

### Run examples locally

- Install all dependencies with `npm install`

- Create an account on [liveblocks.io](https://liveblocks.io/dashboard)

- Copy your secret key from the [administration](https://liveblocks.io/dashboard/apikeys)

- Create a file named `.env.local` and add your Liveblocks secret as environment variable `NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY=pk_test_yourkey`

- Run `npm run dev` and go to [http://localhost:3000](http://localhost:3000)

### Run examples on CodeSandbox

- Open this repository on CodeSandbox with this [link](https://codesandbox.io/s/github/liveblocks/liveblocks/tree/main/examples/nextjs-redux-todo-list)

- Create an account on [liveblocks.io](https://liveblocks.io/dashboard)

- Copy your secret key from the [administration](https://liveblocks.io/dashboard/apikeys)

- Create [secret](https://codesandbox.io/docs/secrets) named `NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY` with the secret key you just copied. You need to create an account on CodeSandbox to add an environment variable.

- Refresh your browser and you should be good to go!
