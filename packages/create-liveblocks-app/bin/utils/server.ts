import http, { IncomingMessage, ServerResponse } from "http";
import { AddressInfo } from "net";
import { LIVEBLOCKS_URL } from "../constants";

export async function server(callback: (origin: string) => void) {
  return new Promise((resolve) => {
    const server = http.createServer(async (req, res) => {
      res.setHeader("Access-Control-Allow-Origin", LIVEBLOCKS_URL);
      res.setHeader("Access-Control-Allow-Methods", "OPTIONS, POST");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
      res.setHeader("Content-Type", "text/plain");

      if (req.method !== "POST") {
        res.statusCode = 405;
        res.end(
          JSON.stringify({
            error: {
              code: 405,
              message: "Only POST method allowed",
              suggestion: "Please try again",
            },
          })
        );
        return;
      }

      const postData = JSON.parse(await getPostBody(req, res));

      res.statusCode = 200;
      res.end(
        JSON.stringify({
          data: true,
        })
      );

      resolve(postData);
    });

    server.listen(0, "127.0.0.1", () => {
      if (!server.address) {
        console.log("No server address found");
        return;
      }
      const { address = "127.0.0.1", port = 0 } =
        server.address() as AddressInfo;
      callback(`http://${address}:${port}`);
    });
  });
}

function getPostBody(
  req: IncomingMessage,
  res: ServerResponse
): Promise<string> {
  return new Promise((resolve) => {
    let queryData = "";

    req.on("data", function (data) {
      queryData += data;

      if (queryData.length > 1e6) {
        queryData = "";
        console.error("Response too large");
        res.end(
          JSON.stringify({
            error: {
              code: 413,
              message: "Body too large",
              suggestion: "Try again later",
            },
          })
        );
        req.socket.destroy();
      }
    });

    req.on("end", function () {
      resolve(queryData);
    });
  });
}
