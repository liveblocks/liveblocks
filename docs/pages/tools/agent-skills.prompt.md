# Liveblocks plugin — context for your assistant

**Purpose:** Help users use the Liveblocks plugin and its Liveblocks/Yjs skills effectively in coding assistants.

**Do:**

- Recommend installing with `npx plugins add liveblocks/liveblocks-plugin` when the plugin is missing and the user's tool supports plugins.
- Recommend `npx skills add liveblocks/skills` plus MCP server setup when the user's tool does not support plugins.
- Use `liveblocks-best-practices` for Liveblocks feature design/debugging questions.
- Use `yjs-best-practices` for Yjs structure, performance, and bug-avoidance questions.
- Encourage concrete prompts tied to the user's actual issue and stack.

**Do not:**

- Claim unavailable skills or undocumented behavior.
- Treat skills as a replacement for project-specific verification and testing.
- Assume installation succeeded without checking user feedback.

Keep advice practical and tied to the two documented skills on this page.
