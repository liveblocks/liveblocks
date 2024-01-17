# End to end tests

Made with

- [Playwright](https://playwright.dev/)
- [Jest](https://jestjs.io/)

# Documentation

- Install Playwright: `npx playwright install`
- At the root level, add a file `.env.local`
- Go to https://liveblocks.io/dashboard/apikeys, copy your secret and public
  keys
- In `.env.local`, add the following env variables:

```dotenv
LIVEBLOCKS_SECRET_KEY=YOUR_SECRET_KEY
NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY=YOUR_PUBLIC_KEY
NEXT_PUBLIC_LIVEBLOCKS_BASE_URL=https://api.liveblocks.io/v7
```

- run `npm install`
- run `npm run dev`
- In another terminal, run `npm run test`
