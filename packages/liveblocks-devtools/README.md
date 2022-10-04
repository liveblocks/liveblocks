# To use

1. Run `npm run build` to build the browser extension for Chrome
1. Navigate to chrome://extensions
1. Enable "Developer mode"
1. Click "Load unpacked" and select the build directory (that contains the `manifest.json` file)
1. Open any local Liveblocks app
1. **This step is currently manual, but will eventually be part of
   @liveblocks/client when running in dev mode**
   Paste the following code in a console tab:

   ```js
   function sendToPanel(message /*: ClientToPanelMessage */) {
     const fullMsg = {
       ...message,
       source: "liveblocks-devtools-client",
     };

     window.postMessage(fullMsg, "*");
   }

   function onMessageFromPanel(message /*: FullPanelToClientMessage */) {
     switch (message.name) {
       case "random-number": {
         sendToPanel({
           name: "round-then-double-the-number",
           value: Math.ceil(message.value) * 2,
         });
         break;
       }

       default: {
         console.error("Unknown message?", message);
       }
     }
   }

   window.addEventListener("message", (event) => {
     if (
       event.source === window &&
       event.data?.source === "liveblocks-devtools-panel"
     ) {
       onMessageFromPanel(event.data);
     } else {
       // Message not for us
     }
   });
   ```

1. Open the Liveblocks dev panel
1. Click to send a message
1. A full round trip will now happen
