import express from "express";
import { join } from "path";
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

// <OPEN-DB>

app.use(cors());

function filterBlockedKeys(obj) {
  if (obj) {
    const blocked = db.data.config?.["block-keys"] || [];
    blocked.forEach((key) => {
      delete obj[key];
    });
  }
  return obj;
}

app.get("/localizations/:locale", (req, res, next) => {
  if (req.params.locale === "config") {
    next();
  } else {
    let lang;
    if (req.query.exact !== "true") {
      if (db.data.config?.block === "true") {
        res.send({});
      } else {
        lang = req.params.locale.replace(".json", "");
        const regex = /([a-z]{2})_[A-Z]{2}/;
        if (regex.test(lang)) {
          lang = regex.exec(lang)[1];
        }
        return res.send(filterBlockedKeys(db.data[lang]) || {});
      }
    } else {
      return res.send(filterBlockedKeys(db.data[req.params.locale]) || {});
    }
  }
});

app.get("/localizations/:locale/:key", (req, res, next) => {
  if (req.params.locale === "config") {
    next();
  } else {
    const data = db.data[req.params.locale]?.[req.params.key];
    if (data) {
      return res.send(data);
    }
    return res.sendStatus(404);
  }
});

// </OPEN-DB>

// <DB>

const API_PASSWORD = process.env.API_PASSWORD;

app.use(express.json({ limit: "50mb", extended: true }));
app.use(express.text());

app.use((req, res, next) => {
  if (API_PASSWORD && req.get("Authorization") !== API_PASSWORD) {
    return res.sendStatus(401);
  }
  next();
});

function assertFormat(req, format, res) {
  if (req.get("Content-Type") !== format) {
    res.status(400).send(`Only Content-Type "${format}" is allowed here!`);
    return false;
  }
  return true;
}

app.get("/localizations", (_, res) => {
  return res.send(db.data);
});

app.post("/localizations", async (req, res) => {
  if (assertFormat(req, "application/json", res)) {
    db.data = req.body;
    await db.write();
    return res.sendStatus(204);
  }
});

app.get("/localizations/config", (_, res) => {
  return res.send(db.data.config || {});
});

app.get("/localizations/config/:key", (req, res) => {
  const data = db.data.config?.[req.params.key];
  return res.send(data);
});

app.post("/localizations/:locale", async (req, res) => {
  if (assertFormat(req, "application/json", res)) {
    db.data[req.params.locale] = filterBlockedKeys(req.body);
    await db.write();
    return res.sendStatus(204);
  }
});

app.post("/localizations/:locale/:key", async (req, res) => {
  if (assertFormat(req, "text/plain", res)) {
    if (!db.data[req.params.locale]) {
      db.data[req.params.locale] = {};
    }
    console.log("set", req.params.locale, req.params.key, "=", req.body);
    db.data[req.params.locale][req.params.key] = req.body;
    await db.write();
    return res.sendStatus(204);
  }
});

// </DB>

app.use((_, res) => {
  return res.sendStatus(404);
});

app.listen(8000, () => {
  console.log("PWA translation manager listening");
});
