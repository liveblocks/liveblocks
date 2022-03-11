echo "Install all dependencies"
npm install
cd -
cd ../../packages/liveblocks-client
npm install
cd -

cd ../../packages/liveblocks-redux
npm install
cd -

echo "Build @liveblocks/client"
cd ../../packages/liveblocks-client
npm run build
npm link

echo "Build @liveblocks/redux"
cd -
cd ../../packages/liveblocks-redux
npm link @liveblocks/client ../../examples/redux-todo-app/node_modules/redux
npm run build
npm link

echo "link @liveblocks/client @liveblocks/redux"
cd -
npm link @liveblocks/client @liveblocks/redux

