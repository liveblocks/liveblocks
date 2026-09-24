<p align="center">
  <a href="https://liveblocks.io#gh-light-mode-only">
    <img src="https://raw.githubusercontent.com/liveblocks/liveblocks/main/.github/assets/header-light.svg" alt="Liveblocks" />
  </a>
  <a href="https://liveblocks.io#gh-dark-mode-only">
    <img src="https://raw.githubusercontent.com/liveblocks/liveblocks/main/.github/assets/header-dark.svg" alt="Liveblocks" />
  </a>
</p>

# Coding Agents

<p>
  <a href="https://codesandbox.io/s/github/liveblocks/liveblocks/tree/main/examples/nextjs-coding-agents">
    <img src="https://img.shields.io/badge/open%20in%20codesandbox-message?style=flat&logo=codesandbox&color=333&logoColor=fff" alt="Open in CodeSandbox" />
  </a>
  <img src="https://img.shields.io/badge/react-message?style=flat&logo=react&color=0bd&logoColor=fff" alt="React" />
  <img src="https://img.shields.io/badge/next.js-message?style=flat&logo=next.js&color=07f&logoColor=fff" alt="Next.js" />
</p>

This example shows how to build a multiplayer coding-agent chat, in the style of
Cursor agents or Codex, with
[Liveblocks Feeds](https://liveblocks.io/docs/products/sync/feeds),
[Notifications](https://liveblocks.io/docs/products/notifications),
[Presence](https://liveblocks.io/docs/api-reference/liveblocks-react#Presence),
the [Cursor SDK](https://cursor.com/docs/sdk/typescript), and
[Next.js](https://nextjs.org/). It's built to be deployed as an internal tool:
your team signs in with GitHub, picks a repository the Cursor GitHub App has
access to, and works with a coding agent together. Everything lives in a single
Liveblocks room: each chat is a feed, and each feed is backed by a durable
Cursor cloud agent that reads the repository, runs commands, and opens pull
requests.

Several people can talk to the same agent at once. A message posted while the
agent is busy is shown as queued; when the current run finishes, the queued
messages are sent as a follow-up run on the same agent. The work done so far is
closed as a log, and the agent continues in a new message below the messages it
picked up, so the single reply for the whole burst always lands at the bottom of
the chat. The agent's tool calls and text are streamed into the feed message
from a [Vercel Workflow](https://workflow.dev/) with
[`@liveblocks/node`](https://liveblocks.io/docs/api-reference/liveblocks-node),
so every client sees the run live. When a run completes, everyone who took part
in the chat gets an inbox notification, and the agent's changes appear in a diff
panel next to the chat, rendered with [`@pierre/diffs`](https://diffs.com),
alongside a tab with the pull request's description read from GitHub.

People can also just talk to each other in a chat without waking the agent.
Before anything runs, the server asks
[Jev](https://vercel.com/ai-gateway/models/jev), TypeSafe AI's evaluation model,
what each message calls for, using the AI SDK's `evaluate` through
[Vercel AI Gateway](https://vercel.com/ai-gateway) with the recent conversation
as context (`lib/server/triage.ts`). It's a three-way choice: **nothing**
(people talking to each other), a **quick answer** (a question the agent can
answer in the chat, streamed in by a language model with the AI SDK's
`streamText`, `workflows/reply-in-chat.ts`; it has read-only tools over the
GitHub API to browse and read files, search code, list commits, and see the
coding agent's diff, `lib/server/repo-tools.ts`), or a **coding session**
(anything that touches the repository or a document, which starts the Cursor
agent). Jev returns probabilities rather than text, so "sounds good, thanks"
stays between teammates, "what does this hook do?" gets a reply in seconds, and
"sounds good, do it" starts a run. A message left to the team is labelled as
such, with a "Send anyway" link for its author; `@AI` rules out "nothing", and
`/` skills always start a coding session. Set `AI_GATEWAY_API_KEY` to enable
this (deployments on Vercel authenticate automatically) and `AI_CHAT_MODEL` to
pick the answering model; without a key, every message goes to the coding agent.

The agent can also write Markdown documents instead of code (a plan, a report,
notes from an investigation). Documents open as tabs in the same side panel as
multiplayer [Tiptap](https://tiptap.dev/) editors, backed by
[Storage](https://liveblocks.io/docs/products/sync/storage) through
[`@liveblocks/react-tiptap`](https://liveblocks.io/docs/api-reference/liveblocks-react-tiptap#Liveblocks-collaboration-mode)'s
`collaborationMode: "liveblocks"`, so team members edit them together with live
cursors. The agent saves its files as Cursor artifacts; after each run the
workflow converts them with `@tiptap/markdown` and merges them into the same
Storage tree with `Liveblocks.mutateStorage` (`lib/server/document-patch.ts`).
It's a three-way merge against the version the agent was shown, block by block:
paragraphs the agent didn't touch keep whatever people did to them meanwhile,
and a changed paragraph becomes a single `LiveText` replacement rather than a
rewrite, so nobody loses their place. The composer is also Tiptap: type `/` to
pick a skill, and choose the model per chat from the dropdown.

Skills are reusable instructions for the agent, loaded from the `skills/`
directory. Each one is a folder with a `SKILL.md` inside: frontmatter with a
`name` and `description` for the menu, then the instructions as the body.

```markdown
---
name: Fix bug
description: Reproduce and fix a bug, with a regression test
---

Treat the message as a bug report. First locate the root cause...
```

The folder name is the skill's id (`/fix-bug`). Add a folder and it appears in
the `/` menu; when a message uses it, the instructions are prepended to the
agent's prompt (`lib/server/skills.ts`, `lib/prompt.ts`).

### How identity works

- **People** sign in with GitHub through [Auth.js](https://authjs.dev). Their
  GitHub login is their Liveblocks user id, and their profile provides the name
  and avatar in the chat. Members of `GITHUB_ALLOWED_ORG` (or logins listed in
  `GITHUB_ALLOWED_USERS`) can start chats and talk to the agent; anyone else who
  signs in gets read-only access and can watch chats in realtime.
- **The agent** runs on a single Cursor API key (`CURSOR_API_KEY`), so every run
  is billed to that key. Use a team service-account key rather than a personal
  one. Commits and pull requests are authored by the Cursor GitHub App
  (`openAsCursorGithubApp`), and the people who asked for the work are credited
  with `Co-authored-by` trailers and a "Requested by" list in the PR.
- **Repositories** come from Cursor: the repository dropdown in the composer
  lists what the Cursor GitHub App can reach for the configured key
  (`GET /v1/repositories`), and the branch dropdown next to it lists the
  repository's branches from GitHub. Public repositories need no credentials for
  that; for private ones set `GITHUB_TOKEN` to a read-only fine-grained token,
  otherwise the branch can still be typed. A chat can also be started with no
  repository, in which case the agent can answer questions and write documents
  but not open pull requests; one can be attached later from the same dropdown,
  after which it's fixed (the branch stays adjustable until the first run uses
  it). Nothing else needs GitHub credentials, including the diff panel, which
  reads a diff the agent saves as a Cursor artifact at the end of every run
  (falling back to GitHub's public branch diff if the agent skipped that step).

If your team wants commits under people's own names instead of the Cursor GitHub
App, Cursor's
[user-scoped worker tokens](https://cursor.com/docs/cloud-agent/api/endpoints#create-a-user-scoped-worker-token)
let a service-account key mint a short-lived token for a specific team member
per run. That's the production path for per-person attribution; it isn't built
into this example.

## Getting started

Run the following command to try this example locally:

```bash
npx create-liveblocks-app@latest --example nextjs-coding-agents --api-key
```

This will download the example and ask permission to open your browser, enabling
you to automatically get your API key from your
[liveblocks.io](https://liveblocks.io) account.

You also need a Cursor API key and a GitHub OAuth app, see
[manual setup](#manual-setup) below.

### Manual setup

<details><summary>Read more</summary>

<p></p>

Alternatively, you can set up your project manually:

- Install all dependencies with `npm install`
- Create an account on [liveblocks.io](https://liveblocks.io/dashboard)
- Copy your **secret** key from the
  [dashboard](https://liveblocks.io/dashboard/apikeys)
- Create an `.env.local` file (see `.env.example`) and add your **secret** key
  as the `LIVEBLOCKS_SECRET_KEY` environment variable
- Create a Cursor API key in the
  [Cursor dashboard](https://cursor.com/dashboard) and add it as
  `CURSOR_API_KEY`. For a team deployment, create a **service account** key
  under your team's settings so runs aren't tied to one person. Cloud agent runs
  are billed to this key at API pricing.
- In the Cursor dashboard, connect GitHub under **Integrations** and grant the
  Cursor GitHub App access to the repositories your team will work on. These are
  the repositories people can pick from; without access, runs fail with
  `Failed to verify existence of branch …`, even when the branch exists.
- Create a [GitHub OAuth App](https://github.com/settings/developers) with the
  callback URL `http://localhost:3000/api/auth/callback/github` (and your
  deployed origin later). Add its client id and secret as `AUTH_GITHUB_ID` and
  `AUTH_GITHUB_SECRET`, and set `AUTH_SECRET` to a random string
  (`openssl rand -base64 32`).
- Set `GITHUB_ALLOWED_ORG` to your GitHub organization so only its members can
  talk to the agent. `GITHUB_ALLOWED_USERS` accepts a comma-separated list of
  logins as well. Leave both empty for local development to let anyone who signs
  in take part.
- Optionally, set `AI_GATEWAY_API_KEY` (from
  [Vercel AI Gateway](https://vercel.com/ai-gateway)) to let people chat among
  themselves without every message reaching the agent, `CURSOR_MODEL` to change
  the default model for new chats, `GITHUB_TOKEN` to list branches of private
  repositories, or `NEXT_PUBLIC_LOCKED_REPO` to pin every chat to one
  repository.
- Run `npm run dev` and go to [http://localhost:3000](http://localhost:3000)

To see the multiplayer behavior, sign in as two different GitHub users in two
browsers. Start a task in one, then post a follow-up from the other while the
agent is working: it shows up as queued and is handled right after the current
task, in the same reply.

</details>

### Deploy on Vercel

<details><summary>Read more</summary>

<p></p>

To both deploy on [Vercel](https://vercel.com), and run the example locally, use
the following command:

```bash
npx create-liveblocks-app@latest --example nextjs-coding-agents --vercel
```

This will download the example and ask permission to open your browser, enabling
you to deploy to Vercel. Add the Cursor, Auth.js, and GitHub variables from
`.env.example` to the project's environment variables as well, and register the
deployment's `/api/auth/callback/github` URL on your GitHub OAuth App.

</details>

### Develop on CodeSandbox

<details><summary>Read more</summary>

<p></p>

After forking
[this example](https://codesandbox.io/s/github/liveblocks/liveblocks/tree/main/examples/nextjs-coding-agents)
on CodeSandbox, create the environment variables from `.env.example` as
[secrets](https://codesandbox.io/docs/secrets).

</details>
