import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { networkInterfaces } from "node:os";

const root = fileURLToPath(new URL(".", import.meta.url));
const port = Number(process.env.PORT || 4174);
const host = process.env.HOST || "0.0.0.0";

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
};

const server = createServer(async (request, response) => {
  const rawPath = decodeURIComponent(request.url.split("?")[0]);
  const path = rawPath === "/" ? "/index.html" : rawPath;
  const filePath = join(root, normalize(path).replace(/^(\.\.[/\\])+/, ""));

  if (!filePath.startsWith(root)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const body = await readFile(filePath);
    response.writeHead(200, {
      "content-type": types[extname(filePath)] || "application/octet-stream",
    });
    response.end(body);
  } catch {
    response.writeHead(404);
    response.end("Not found");
  }
});

server.listen(port, host, () => {
  const localUrls = Object.values(networkInterfaces())
    .flat()
    .filter((net) => net && net.family === "IPv4" && !net.internal)
    .map((net) => `http://${net.address}:${port}`);

  console.log(`Tianji prototype local http://127.0.0.1:${port}`);
  localUrls.forEach((url) => console.log(`Tianji prototype mobile ${url}`));
});
