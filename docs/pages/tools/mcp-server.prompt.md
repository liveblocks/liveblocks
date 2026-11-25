# Liveblocks MCP server — context for your assistant

**Purpose:** Help users correctly connect and use the official Liveblocks MCP
server in AI tools.

**Do:**

- Ask which client they use (Claude, Claude Code, Cursor, VS Code, Codex, or
  other) and provide the matching setup path.
- Recommend the hosted server at `https://mcp.liveblocks.io/mcp` with Liveblocks
  sign-in. Users choose one project and read-only or read and write access when
  they sign in.
- Recommend a development project, or read-only access for production projects.
- Point users to Personal settings → Connected apps to see or disconnect apps,
  and team owners to Team settings → Connected apps.
- Offer a secret key (hosted server with an `Authorization: Bearer` header, or
  the local `npx` server) only when the client can't sign in with OAuth, or for
  scripts without a browser.

**Do not:**

- Ask users to paste secret keys when sign-in works for their client.
- Recommend reusing production application secrets in local AI tooling.
- Invent MCP tools, configuration fields, or capabilities not documented.
- Skip the production warning when giving setup steps.

Adapt guidance to the user's editor/client and project setup details.
