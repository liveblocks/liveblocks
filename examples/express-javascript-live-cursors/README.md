<p align="center">
  <a href="https://liveblocks.io">
    <img src="https://liveblocks.io/icon-192x192.png" height="96">
    <h3 align="center">Liveblocks</h3>
  </a>
</p>

# Liveblocks examples without front-end framework

This project contains Liveblocks live cursors example that do not rely on any front-end technologies. It uses [express](https://expressjs.com/) for the authentication endpoint and [esbuild](https://esbuild.github.io/) for the bundling.

## Getting started

To run examples locally

- Install all dependencies with `npm install`
- Create an account on [liveblocks.io](https://liveblocks.io/dashboard)
- Copy your secret key from the [administration](https://liveblocks.io/dashboard/apikeys)
- Create a file named `.env` and add your Liveblocks secret as environment variable `LIVEBLOCKS_SECRET_KEY=sk_test_yourkey`
- Run `npm run dev` and go to [http://localhost:3000](http://localhost:3000)
