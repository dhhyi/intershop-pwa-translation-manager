import express from "express";
import { join, dirname } from "path";
import { existsSync } from "fs";
import { Low, JSONFile } from "lowdb";
import cors from "cors";

const DB_FILE_NAME = "db.json";
const file = join(process.cwd(), DB_FILE_NAME);
const adapter = new JSONFile(file);
const db = new Low(adapter);

await db.read();
db.data = db.data || {};
if (!existsSync(DB_FILE_NAME)) {
  await db.write();
}

const app = express();

// <ANGULAR>

app.get("/", (req, _, next) => {
  req.url = "/index.html";
  next();
});

app.get(/.*(html|css|js|ico)$/, express.static("dist"));

// </ANGULAR>

// <DB>

app.use(cors());

app.use(express.json({ limit: "50mb", extended: true }));
app.use(express.text());

function wrap(res, data) {
  if (data) {
    res.send(data);
  } else {
    res.sendStatus(404);
  }
}

function assertFormat(req, format, res) {
  if (req.get("Content-Type") !== format) {
    res.status(400).send(`Only Content-Type "${format}" is allowed here!`);
    return false;
  }
  return true;
}

function guard(req, res) {
  if (req.get("Authorization") !== "super-safe-password") {
    res.sendStatus(401);
    return false;
  }
  return true;
}

app.get("/localizations", (_, res) => {
  res.send(db.data);
});

app.post("/localizations", async (req, res) => {
  if (assertFormat(req, "application/json", res) && guard(req, res)) {
    db.data = req.body;
    await db.write();
    res.sendStatus(204);
  }
});

app.get("/localizations/:locale", (req, res) => {
  let lang;
  if (req.query.exact !== "true") {
    lang = req.params.locale.replace(".json", "");
    const regex = /([a-z]{2})_[A-Z]{2}/;
    if (regex.test(lang)) {
      lang = regex.exec(lang)[1];
    }
  } else {
    lang = req.params.locale;
  }

  res.send(db.data[lang] || {});
});

app.post("/localizations/:locale", async (req, res) => {
  if (assertFormat(req, "application/json", res) && guard(req, res)) {
    db.data[req.params.locale] = req.body;
    await db.write();
    res.sendStatus(204);
  }
});

app.get("/localizations/:locale/:key", (req, res) => {
  wrap(res, db.data[req.params.locale]?.[req.params.key]);
});

app.post("/localizations/:locale/:key", async (req, res) => {
  if (assertFormat(req, "text/plain", res) && guard(req, res)) {
    if (!db.data[req.params.locale]) {
      db.data[req.params.locale] = {};
    }
    console.log("set", req.params.locale, req.params.key, "=", req.body);
    db.data[req.params.locale][req.params.key] = req.body;
    await db.write();
    res.sendStatus(204);
  }
});

// </DB>

app.get("*", (_, res) => {
  res.sendStatus(404);
});

app.listen(8000, () => {
  console.log("PWA translation manager listening");
});
