const { program } = require("commander");
const fs = require("fs");
const http = require("http");
const superagent = require("superagent");

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
  const fullUrl = new URL(req.url, `http://${host}:${port}`);
  const code = Number(fullUrl.pathname.replace("/", ""));

  if (Number.isNaN(code)) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not Found");
  }

  const filePath = `${cachePath}/${code}.jpeg`;
  if (req.method === "GET") {
    try {
      const image = await fs.promises.readFile(filePath);

      res.writeHead(200, { "Content-Type": "image/jpeg" });
      res.end(image);
    } catch (err) {
      if (err.code === "ENOENT") {
        const response = await superagent
          .get(`https://http.cat/${code}.jpg`)
          .responseType("buffer")
          .ok(() => true);

        if (response.status !== 200) {
          res.writeHead(404, { "Content-Type": "text/plain" });
          res.end("Image not found on http.cat");
          return;
        }

        const resp = await superagent
          .put(`http://${host}:${port}/${code}`)
          .set("Content-Type", "image/jpeg")
          .send(response.body)
          .ok(() => true);

        if (resp.status !== 201) {
          res.writeHead(404, { "Content-Type": "text/plain" });
          res.end(resp.text);
          return;
        }

        res.writeHead(200, { "Content-Type": "image/jpeg" });
        res.end(response.body);
      } else {
        res.writeHead(500, { "Content-Type": "text/plain" });
        res.end("Server error: " + err.message);
      }
    }
  } else if (req.method === "PUT") {
    try {
      const chunks = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);
      await fs.promises.writeFile(filePath, buffer);

      res.writeHead(201);
      res.end();
    } catch (err) {
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end("Server error: " + err.message);
    }
  } else if (req.method === "DELETE") {
    try {
      await fs.promises.rm(filePath);
      res.writeHead(200);
      res.end();
    } catch (err) {
      if (err.code === "ENOENT") {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("Not Found: Image does not exist");
      } else {
        res.writeHead(500, { "Content-Type": "text/plain" });
        res.end("Server error: " + err.message);
      }
    }
  } else {
    res.writeHead(405, { "Content-Type": "text/plain" });
    res.end("Method not allowed");
  }
});

server.listen(port, host, () => {
  console.log(`Server running at http://${host}:${port}/`);
});
