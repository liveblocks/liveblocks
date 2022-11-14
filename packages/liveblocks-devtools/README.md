# Building and installing the browser extension

1. Run `turbo build --filter @liveblocks/devtools` from the project root to
   build the browser extension for Chrome
1. Navigate to chrome://extensions
1. Enable "Developer mode"
1. Click "Load unpacked" and select the outputted `dist/chrome-mv3-prod`
   directory (which contains the `manifest.json` file)

# Testing the browser extension on an app

1. First, link the example to
   [use local Liveblocks](https://github.com/liveblocks/liveblocks/blob/main/examples/README.md#linking-examples-to-the-local-liveblocks-packages)
1. Navigate to chrome://extensions
1. Make sure to reload the extension after every build
1. After reloading the extension, reload the Liveblocks app
1. After reloading the extension, close/reopen the devtools panel

Reloading in the correct order is important for the changes to work.
