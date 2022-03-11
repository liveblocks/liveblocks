echo "Install all dependencies"
npm install
cd -
cd ../../packages/liveblocks-client
npm install
cd -

cd ../../packages/liveblocks-zustand
npm install
cd -

echo "Build @liveblocks/client"
cd ../../packages/liveblocks-client
npm run build
npm link

echo "Build @liveblocks/zustand"
cd -
cd ../../packages/liveblocks-zustand
npm link @liveblocks/client ../../examples/zustand-todo-app/node_modules/zustand
npm run build
npm link

echo "link @liveblocks/client @liveblocks/zustand"
cd -
npm link @liveblocks/client @liveblocks/zustand

