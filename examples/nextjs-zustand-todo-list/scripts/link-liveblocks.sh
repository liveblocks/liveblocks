echo "Install all dependencies"
npm install

echo "Build @liveblocks/client"
cd ../../packages/liveblocks
npm install
npm run build
npm link

echo "Build @liveblocks/zustand"
cd -
cd ../../packages/liveblocks-zustand
npm install
npm link @liveblocks/client ../../examples/nextjs-zustand-todo-list/node_modules/zustand
npm run build
npm link

echo "link @liveblocks/client @liveblocks/zustand"
cd -
npm link @liveblocks/client @liveblocks/zustand