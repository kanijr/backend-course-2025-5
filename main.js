const { program } = require("commander");
const fs = require("fs");
const http = require("http");

program
  .requiredOption("-h, --host <host>", "Server listen host")
  .requiredOption("-p, --port <number>", "Server listen port")
  .requiredOption("-c, --cache <path>", "Path to cache directory");

program.parse();
const options = program.opts();

const cachePath = options.cache;

const { port, host } = options;

if (!fs.existsSync(cachePath)) {
  fs.mkdirSync(cachePath, { recursive: true });
}

const server = http.createServer(async (req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Server created");
});

server.listen(port, host, () => {
  console.log(`Server running at http://${host}:${port}/`);
});
