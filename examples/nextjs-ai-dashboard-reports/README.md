<p align="center">
  <a href="https://liveblocks.io#gh-light-mode-only">
    <img src="https://raw.githubusercontent.com/liveblocks/liveblocks/main/.github/assets/header-light.svg" alt="Liveblocks" />
  </a>
  <a href="https://liveblocks.io#gh-dark-mode-only">
    <img src="https://raw.githubusercontent.com/liveblocks/liveblocks/main/.github/assets/header-dark.svg" alt="Liveblocks" />
  </a>
</p>

# AI chat in reports dashboard

<p>
  <a href="https://liveblocks.io/examples/collaborative-text-editor/nextjs-ai-dashboard-reports">
    <img src="https://img.shields.io/badge/live%20preview-message?style=flat&logo=data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTE2Ljg0OSA0Ljc1SDBsNC44NDggNS4wNzV2Ny4wMDhsMTItMTIuMDgzWk03LjE1IDE5LjI1SDI0bC00Ljg0OS01LjA3NVY3LjE2N2wtMTIgMTIuMDgzWiIgZmlsbD0iI2ZmZiIvPjwvc3ZnPg==&color=333" alt="Live Preview" />
  </a>
  <a href="https://codesandbox.io/s/github/liveblocks/liveblocks/tree/main/examples/nextjs-ai-dashboard-reports">
    <img src="https://img.shields.io/badge/open%20in%20codesandbox-message?style=flat&logo=codesandbox&color=333&logoColor=fff" alt="Open in CodeSandbox" />
  </a>
  <img src="https://img.shields.io/badge/react-message?style=flat&logo=react&color=0bd&logoColor=fff" alt="React" />
  <img src="https://img.shields.io/badge/next.js-message?style=flat&logo=next.js&color=07f&logoColor=fff" alt="Next.js" />
  <img src="https://img.shields.io/badge/blocknote-message?style=flat&color=07f" alt="BlockNote" />
</p>

This example shows how to build a pop-up AI chat inside a reports dashboard with
[Liveblocks](https://liveblocks.io), [Tremor](https://tremor.so/), and
[Next.js](https://nextjs.org/).

<img src="https://raw.githubusercontent.com/liveblocks/liveblocks/main/.github/assets/examples/text-editor.png" width="536" alt="Collaborative Text Editor" />

## Getting started

Run the following command to try this example locally:

```bash
npx create-liveblocks-app@latest --example nextjs-ai-dashboard-reports --api-key
```

This will download the example and ask permission to open your browser, enabling
you to automatically get your API key from your
[liveblocks.io](https://liveblocks.io) account.

### Manual setup

<details><summary>Read more</summary>

<p></p>

Alternatively, you can set up your project manually:

- Install all dependencies with `npm install`
- Create an account on [liveblocks.io](https://liveblocks.io/dashboard)
- Copy your **secret** key from the
  [dashboard](https://liveblocks.io/dashboard/apikeys)
- Create an `.env.local` file and add your **secret** key as the
  `LIVEBLOCKS_SECRET_KEY` environment variable
- Run `npm run dev` and go to [http://localhost:3000](http://localhost:3000)

</details>

### Deploy on Vercel

<details><summary>Read more</summary>

<p></p>

To both deploy on [Vercel](https://vercel.com), and run the example locally, use
the following command:

```bash
npx create-liveblocks-app@latest --example nextjs-ai-dashboard-reports --vercel
```

This will download the example and ask permission to open your browser, enabling
you to deploy to Vercel.

</details>

### Develop on CodeSandbox

<details><summary>Read more</summary>

<p></p>

After forking
[this example](https://codesandbox.io/s/github/liveblocks/liveblocks/tree/main/examples/nextjs-ai-dashboard-reports)
on CodeSandbox, create the `LIVEBLOCKS_SECRET_KEY` environment variable as a
[secret](https://codesandbox.io/docs/secrets).

</details>

## Tremor

This project uses
[`Tremor Raw`](https://raw.tremor.so/docs/getting-started/installation)
components for the UI.

### License

This site template is a commercial product and is licensed under the
[Tremor License](https://blocks.tremor.so/license).

### Learn more

For a deeper understanding of the technologies used in this template, check out
the resources listed below:

- [Tremor Raw](https://raw.tremor.so) - Tremor Raw documentation
- [Tailwind CSS](https://tailwindcss.com) - A utility-first CSS framework
- [Next.js](https://nextjs.org/docs) - Next.js documentation
- [Radix UI](https://www.radix-ui.com) - Radix UI Website
- [Recharts](https://recharts.org) - Recharts documentation and website
- [Tanstack](https://tanstack.com/table/latest) - TanStack table documentation
