#!/bin/sh

# E2E tests

echo "Upgrade next-sandbox to $1"
cd e2e/next-sandbox
npm install @liveblocks/client@$1 @liveblocks/react@$1 @liveblocks/zustand@$1 @liveblocks/redux@$1

cd -
echo "Upgrade node-sandbox to $1"
cd e2e/node-sandbox
npm install @liveblocks/client@$1

# Examples

cd -
echo "Upgrade express-javascript-live-cursors to $1"
cd examples/express-javascript-live-cursors
npm install @liveblocks/client@$1

cd -
echo "Upgrade javascript-live-cursors to $1"
cd examples/javascript-live-cursors
npm install @liveblocks/client@$1

cd -
echo "Upgrade nextjs-live-avatars to $1"
cd examples/nextjs-live-avatars
npm install @liveblocks/client@$1 @liveblocks/react@$1

cd -
echo "Upgrade nextjs-live-cursors to $1"
cd examples/nextjs-live-cursors
npm install @liveblocks/client@$1 @liveblocks/react@$1

cd -
echo "Upgrade nextjs-logo-builder to $1"
cd examples/nextjs-logo-builder
npm install @liveblocks/client@$1 @liveblocks/react@$1

cd -
echo "Upgrade nextjs-threejs-shoe to $1"
cd examples/nextjs-threejs-shoe
npm install @liveblocks/client@$1 @liveblocks/react@$1

cd -
echo "Upgrade nextjs-whiteboard to $1"
cd examples/nextjs-whiteboard
npm install @liveblocks/client@$1 @liveblocks/react@$1

cd -
echo "Upgrade nextjs-zustand-whiteboard to $1"
cd examples/nextjs-zustand-whiteboard
npm install @liveblocks/client@$1 @liveblocks/zustand@$1

cd -
echo "Upgrade nuxtjs-live-avatars to $1"
cd examples/nuxtjs-live-avatars
npm install @liveblocks/client@$1

cd -
echo "Upgrade react-dashboard to $1"
cd examples/react-dashboard
npm install @liveblocks/client@$1 @liveblocks/react@$1

cd -
echo "Upgrade react-multiplayer-drawing-app to $1"
cd examples/react-multiplayer-drawing-app
npm install @liveblocks/client@$1 @liveblocks/react@$1

cd -
echo "Upgrade react-todo-app to $1"
cd examples/react-todo-app
npm install @liveblocks/client@$1 @liveblocks/react@$1

cd -
echo "Upgrade redux-todo-app to $1"
cd examples/redux-todo-app
npm install @liveblocks/client@$1 @liveblocks/redux@$1

cd -
echo "Upgrade sveltekit-live-avatars to $1"
cd examples/sveltekit-live-avatars
npm install @liveblocks/client@$1

cd -
echo "Upgrade sveltekit-live-cursors to $1"
cd examples/sveltekit-live-cursors
npm install @liveblocks/client@$1

cd -
echo "Upgrade vuejs-live-cursors to $1"
cd examples/vuejs-live-cursors
npm install @liveblocks/client@$1

cd -
echo "Upgrade zustand-todo-app to $1"
cd examples/zustand-todo-app
npm install @liveblocks/client@$1 @liveblocks/zustand@$1

