#!/bin/sh

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
echo "Upgrade nextjs-todo-list to $1"
cd examples/nextjs-todo-list
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
echo "Upgrade express-javascript-live-cursors to $1"
cd examples/express-javascript-live-cursors
npm install @liveblocks/client@$1

cd -
echo "Upgrade javascript-live-cursors to $1"
cd examples/javascript-live-cursors
npm install @liveblocks/client@$1

cd -
echo "Upgrade nuxtjs-live-avatars to $1"
cd examples/nuxtjs-live-avatars
npm install @liveblocks/client@$1

cd -
echo "Upgrade react-dashboard to $1"
cd examples/react-dashboard
npm install @liveblocks/client@$1 @liveblocks/react@$1

cd -
echo "Upgrade vuejs-live-cursors to $1"
cd examples/vuejs-live-cursors
npm install @liveblocks/client@$1
