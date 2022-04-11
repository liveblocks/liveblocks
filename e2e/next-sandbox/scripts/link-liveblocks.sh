echo "Install all dependencies"
npm install
cd -
cd ../../packages/liveblocks-client
npm install
cd -

cd ../../packages/liveblocks-zustand
npm install
cd -

cd ../../packages/liveblocks-react
npm install
cd -

cd ../../packages/liveblocks-redux
npm install
cd -


echo "Build @liveblocks/client"
cd ../../packages/liveblocks-client
npm run build
npm link

echo "Build @liveblocks/react"
cd -
cd ../../packages/liveblocks-react
npm link @liveblocks/client ../../e2e/next-sandbox/node_modules/react
npm run build
npm link

echo "Build @liveblocks/zustand"
cd -
cd ../../packages/liveblocks-zustand
npm link @liveblocks/client ../../e2e/next-sandbox/node_modules/zustand
npm run build
npm link

echo "Build @liveblocks/redux"
cd -
cd ../../packages/liveblocks-redux
npm link @liveblocks/client
npm run build
npm link

echo "link @liveblocks/client @liveblocks/zustand @liveblocks/react @liveblocks/react"
cd -
npm link @liveblocks/client @liveblocks/zustand @liveblocks/react @liveblocks/redux

