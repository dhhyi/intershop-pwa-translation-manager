const express = require("express");

const app = express();

app.get("/", (req, _, next) => {
  req.url = "/index.html";
  next();
});

app.get(/.*(html|css|js|ico)$/, express.static("dist"));

app.get("*", (_, res) => {
  res.sendStatus(404);
});

app.listen(8000, () => {
  console.log("PWA translation manager listening");
});
