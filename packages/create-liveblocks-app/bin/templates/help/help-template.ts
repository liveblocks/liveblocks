import c from "ansi-colors";

export function create() {
  console.log(c.bold("create-liveblocks-app"));
  console.log(`This is an installer that allows you to easily set up your 
Liveblocks starter kit or example.`);
  console.log();
  console.log(c.bold("Please report any issues on GitHub"));
  console.log("https://github.com/liveblocks/liveblocks/issues");
  console.log();
  console.log(c.bold("How to use"));
  console.log(`All flags are optional, as the UI can be used
  
Usage:  
  npx create-liveblocks-app [options]
  
Options:
  --next 
  Use the Next.js Starter Kit
  
  --example [example name]
  Use a Liveblocks example, the name corresponding to the example name in the repo 
  e.g. \`--example zustand-whiteboard\` for https://github.com/liveblocks/liveblocks/tree/main/examples/zustand-whiteboard
  
  --name [repo name]
  The name of the project/directory
  e.g. \`--name my-liveblocks-project\`
  
  --package-manager [\`npm\`|\`yarn\`|\`pnpm\`]
  Select your package manager, default is \`npm\`
  e.g \`--package-manager yarn\`
  
  --auth [\`demo\`|\`github\`|\`auth0\`]
  Select your authentication method. Option only for Next.js Starter Kit
  e.g. \`--auth github\`
  
  --install
  Install the project with the selected package manager
  
  --no-install
  Don't install the project
  
  --git
  Initialize git
  
  --no-git
  Don't initialize git
  
  --vercel
  Deploy on Vercel, and get Liveblocks API key
  
  --no-vercel
  Don't deploy on Vercel
  
  --get-key
  Get Liveblocks API key
  
  --no-get-key
  Don't get Liveblocks API key
  
  --open
  Open browser without asking permission, when deploying to Vercel or getting API key 
  
  --help
  Find more info`);
  console.log();
}
