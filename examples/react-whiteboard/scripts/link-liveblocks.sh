echo "Install all dependencies"
npm install

echo "Build @liveblocks/client"
cd ../../packages/liveblocks-client
npm install
npm run build
npm link

echo "Build @liveblocks/react"
cd -
cd ../../packages/liveblocks-react
npm install
npm link @liveblocks/client ../../examples/react-whiteboard/node_modules/react
npm run build
npm link

echo "link @liveblocks/client @liveblocks/react"
cd -
npm link @liveblocks/client @liveblocks/react