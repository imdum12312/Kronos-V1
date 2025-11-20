import { server as wisp } from "@mercuryworkshop/wisp-js/server";
import express from "express";

const app = express();
const port = process.env.PORT || 5001;

app.use(express.static("./public"));

const server = app.listen(port, () => {
  console.log(`Server started on port: ${port}`);
});

server.on("upgrade", (request, socket, head) => {
  wisp.routeRequest(request, socket, head, {
    logger: {
      info: () => {},
      warn: () => {},
      error: () => {},
    },
  });
});

setTimeout(() => {
    console.clear();
}, 60 * 1000); // 60000 milliseconds = 60 seconds
