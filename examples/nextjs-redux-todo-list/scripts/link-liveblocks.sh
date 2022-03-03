echo "Install all dependencies"
npm install

echo "Build @liveblocks/client"
cd ../../packages/liveblocks-client
npm install
npm run build
npm link

echo "Build @liveblocks/redux"
cd -
cd ../../packages/liveblocks-redux
npm install
npm link @liveblocks/client ../../examples/nextjs-redux-todo-list/node_modules/redux
npm run build
npm link

echo "link @liveblocks/client @liveblocks/redux"
cd -
npm link @liveblocks/client @liveblocks/redux