## Interactive tutorials

### How to create a new one
1. Inside the correct technology directory, create a folder with the URL slug as the name
2. Each page of the tutorial has a separate folder. Inside this folder is the following structure:
```
intial - The project shown when the page loads
solved - The project shown when you press the "Show solution" button 
guide.mdx - The markdown guide
```

OR

```
intial - The project shown when the page loads
solved-diff - The project files that differ to initial when you press "Show solution" button 
guide.mdx - The markdown guide
```

3. Inside `initial` and `solved` you can place a Next.js project (and other project types later).
4. Inside the files you can use tokens. I'd recommend using these the way I'm using them in `getting-started`
5. You should copy `_app.tsx` and `styles/global.css` from `getting-started` into every Next.js project, and then modify then as needed.
6. To add your pages to the tutorial, add them to `/learn/tutorials.json`

#### Environment variables
Use `.env` and not `.env.local` for environment variables, e.g.:

```
LIVEBLOCKS_SECRET_KEY={% LIVEBLOCKS_SECRET_KEY %}
NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY={% LIVEBLOCKS_PUBLIC_KEY %}
```

I'm using `.env.development` to hide unimportant variables.

#### guide.mdx
For tutorials, I'd recommend showing everything in `/pages`, `/styles`, `/src`, `/components/`, `.env`, `package.json`, and `liveblocks.config.ts`. I don't think other config files are important.

In the getting started guide, I'll be hiding most files to make everything as simple as possible.
```md
---
// which file is open on page load
openFile: "/liveblocks.config.ts"

// which files are visible in the project
showFiles: [ 
  "/liveblocks.config.ts",
  "/pages/index.tsx",
]
---

[MDX guide here]
```

#### Link to files in editor
To create a link that changes files in the editor, use a file hash: e.g. `[this file](#/pages/index.tsx)` will change to `/pages/index.tsx`.

Note that this always starts with `#/` and the link should NOT have \` around it e.g.: `[this file]` is correct and will be displayed like code.


#### tutorials.json
```
{
  "slug": "welcome", // url slug
  "title": "Welcome to Liveblocks", // page title, goes in <title>
  "description": "Interactively learn Liveblocks" // goes in <title>
},
```

#### Tokens
```
{% LIVEBLOCKS_PUBLIC_KEY %} - Public API key
{% LIVEBLOCKS_SECRET_KEY %} - Secret API key
{% ROOM_ID %} - The room name that is being used
{% RANDOM_ID %} - A random id
{% DEFAULT_SCRIPTS %} - Needed in _app.tsx of every project
{% DEFAULT_STYLES %} - Needed in globals.css file in every project
```

