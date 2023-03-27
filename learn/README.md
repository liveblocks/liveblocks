## Interactive tutorials

### How to start a new one
1. Inside the correct technology directory, create a folder with the URL slug as the name
2. Each page of the tutorial has a separate folder. Inside this folder is the following structure:
3. 
```
intial - The project shown when the page loads
solved - The project shown when you press the "Show solution" button 
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
```md
---
// which files is open on page load
openFile: "/liveblocks.config.ts"

// which files are visible in the project
showFiles: [ 
"/liveblocks.config.ts",
]
---

[MDX guide here]
```

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

