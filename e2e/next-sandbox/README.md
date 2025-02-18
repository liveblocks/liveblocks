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

# User Notification Settings Configuration

To make the user notification settings e2e tests running locally you need to
ensure you have setup your project notification settings first. It can be done
by doing either:

- 👉🏻 Go to the project notification page on the dashboard locally (e.g
  `http://localhost:3001/dashboard/<account_id>/projects/<project_id>/notifications`)
  → It will automatically do the job just by visiting this page.
- 👉🏻 Run the following CURL request:
  ```sh
  curl -X POST \
    'https://<dev_worker_url>/dashboard/projects/<project_id>/notification-settings/setup' \
    -H 'Content-Type: application/json' \
    -H 'Authorization: <authorization_token>' \
    -d '{}'
  ```
  → It will setup your project notification settings.
  > Those user notification settings e2e tests are skipped on CI for now.
