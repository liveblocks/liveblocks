# End to end tests

Made with

- [Playwright](https://playwright.dev/)
- [Jest](https://jestjs.io/)

# Documentation

- Install Playwright: `npx playwright install`
- At the root level, add a file `.env.local`
- Go to https://liveblocks.io/dashboard/apikeys, copy your secret key
- In `.env.local`, add the the env variable: `LIVEBLOCKS_SECRET_KEY=YOUR_SECRET_KEY`
- run `npm install`
- run `npm run dev`
- In another terminal, run `npm run test`
