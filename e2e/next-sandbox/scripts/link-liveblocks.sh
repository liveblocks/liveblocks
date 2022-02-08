echo "Install all dependencies"
npm install

echo "Build @liveblocks/client"
cd ../../packages/liveblocks
npm install
npm run build
npm link

echo "Build @liveblocks/react"
cd -
cd ../../packages/liveblocks-react
npm install
npm link @liveblocks/client ../../e2e/next-sandbox/node_modules/react
npm run build
npm link


echo "Build @liveblocks/zustand"
cd -
cd ../../packages/liveblocks-zustand
npm install
npm link @liveblocks/client ../../e2e/next-sandbox/node_modules/zustand
npm run build
npm link

echo "link @liveblocks/client @liveblocks/zustand @liveblocks/react"
cd -
npm link @liveblocks/client @liveblocks/zustand @liveblocks/react