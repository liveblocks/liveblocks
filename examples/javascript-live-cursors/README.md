<p align="center">
  <a href="https://liveblocks.io">
    <img src="https://liveblocks.io/icon-192x192.png" height="96">
    <h3 align="center">Liveblocks</h3>
  </a>
</p>

# Liveblocks examples without front-end framework

This project contains Liveblocks examples that do not rely on any front-end technologies. It uses [esbuild](https://esbuild.github.io/) for the bundling.

## Getting started

To run examples locally

- Install all dependencies with `npm install`
- Create an account on [liveblocks.io](https://liveblocks.io/dashboard)
- Copy your public key from the [administration](https://liveblocks.io/dashboard/apikeys)
- In `app.js` `createClient` replace `pk_YOUR_PUBLIC_KEY` by your Liveblocks public key
- Run `npm run build` and open `static/index.html` in your browser
