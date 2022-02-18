echo "Install all dependencies"
npm install
cd -
cd ../../packages/liveblocks
npm install
cd -
cd ../../packages/liveblocks-react
npm install
cd -

echo "Build @liveblocks/client"
cd ../../packages/liveblocks
npm run build
npm link

echo "Build @liveblocks/react"
cd -
cd ../../packages/liveblocks-react
npm link @liveblocks/client ../../e2e/next-sandbox/node_modules/react
npm run build
npm link


echo "link @liveblocks/client @liveblocks/react"
cd -
npm link @liveblocks/client @liveblocks/react