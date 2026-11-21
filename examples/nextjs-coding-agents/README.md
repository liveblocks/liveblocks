<p align="center">
  <a href="https://liveblocks.io#gh-light-mode-only">
    <img src="https://raw.githubusercontent.com/liveblocks/liveblocks/main/.github/assets/header-light.svg" alt="Liveblocks" />
  </a>
  <a href="https://liveblocks.io#gh-dark-mode-only">
    <img src="https://raw.githubusercontent.com/liveblocks/liveblocks/main/.github/assets/header-dark.svg" alt="Liveblocks" />
  </a>
</p>

## Coding agents

This demo shows you how to implement a multiplayer coding-agent chat, in the
style of Cursor agents or Codex, with [Liveblocks](https://liveblocks.io/). Your
team signs in with GitHub, talks to a Cursor cloud agent together, and
[Jev](https://vercel.com/ai-gateway/models/jev) decides per message whether the
agent should stay out, answer quickly, or start coding.

- **Shared chats**: each chat is a Liveblocks Feed backed by a durable Cursor
  cloud agent; everyone sees tool calls and text stream in live, with presence
  and typing indicators.
- **Queue and merge**: messages posted while the agent is busy are queued and
  handled as a follow-up on the same agent, with one reply at the bottom.
- **Jev triage**: TypeSafe AI's evaluation model reads each message with the
  recent conversation and picks nothing, a quick answer, or a coding session;
  `@AI` forces a response.
- **Quick answers**: questions are answered in seconds by the chat's model via
  the AI SDK and Vercel AI Gateway, with read-only tools to browse the
  repository, search code, list commits, and read the agent's diff.
- **Coding sessions**: change requests start the Cursor agent, which commits,
  pushes, and opens a pull request credited to the people who asked.
- **Changes and PR tabs**: a side panel shows the agent's diff (rendered with
  `@pierre/diffs`) and the pull request description from GitHub.
- **Multiplayer documents**: the agent can write Markdown documents instead of
  code; they open as collaborative Tiptap editors backed by Liveblocks Storage,
  and the agent's later edits are merged block by block around people's changes.
- **Skills**: reusable instructions picked with `/`; drop a `SKILL.md` into
  `skills/<id>/` to add one.
- **Repositories on demand**: start a chat with or without a repository; attach
  one later, after which it's fixed.
- **Notifications**: everyone who took part in a chat gets an inbox notification
  when the agent finishes.
- **Access control**: members of your GitHub organization (or an allow-list) can
  talk to the agent; anyone else who signs in can watch.

### Set up

- Install all dependencies with `npm install`
- Create an account on [liveblocks.io](https://liveblocks.io/dashboard)
- Copy your **secret** key from the
  [dashboard](https://liveblocks.io/dashboard/apikeys)
- Create an `.env.local` file at the root (see `.env.example`) and add your
  **secret** key as the `LIVEBLOCKS_SECRET_KEY` environment variable
- Create a Cursor API key in the
  [Cursor dashboard](https://cursor.com/dashboard) and add it as
  `CURSOR_API_KEY` (use a team **service account** key so runs aren't tied to
  one person)
- In the Cursor dashboard, connect GitHub under **Integrations** and grant the
  Cursor GitHub App access to the repositories your team will work on
- Create a [GitHub OAuth App](https://github.com/settings/developers) with the
  callback URL `http://localhost:3000/api/auth/callback/github`, and add its
  client id and secret as `AUTH_GITHUB_ID` and `AUTH_GITHUB_SECRET`
- Set `AUTH_SECRET` to a random string (`openssl rand -base64 32`)
- Set `GITHUB_ALLOWED_ORG` to your GitHub organization, or list logins in
  `GITHUB_ALLOWED_USERS`; leave both empty locally to let anyone who signs in
  take part
- Create an account on [vercel.com](https://vercel.com)
- Copy your **AI gateway key** from the
  [dashboard](https://vercel.com/ai-gateway) into the `AI_GATEWAY_API_KEY`
  environment variable (this enables Jev triage and quick answers; without it,
  every message goes to the coding agent)
- Optionally set `GITHUB_TOKEN` to a read-only fine-grained token so private
  repositories' branches and files can be read, `CURSOR_MODEL` to change the
  default model, or `NEXT_PUBLIC_LOCKED_REPO` to pin every chat to one
  repository
- Run `npm run dev` and go to [http://localhost:3000](http://localhost:3000)

To see the multiplayer behavior, sign in as two different GitHub users in two
browsers. Start a task in one, then post a follow-up from the other while the
agent is working: it shows up as queued and is handled right after the current
task.

### Deploy on Vercel

Deploy with [Vercel](https://vercel.com) and add the variables from
`.env.example` to the project's environment variables (the AI Gateway key isn't
needed there; deployments authenticate automatically). Register the deployment's
`/api/auth/callback/github` URL on your GitHub OAuth App.
