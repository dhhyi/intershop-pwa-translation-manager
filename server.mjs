import express from "express";
import { join } from "path";
import { existsSync } from "fs";
import { Low, JSONFile } from "lowdb";
import cors from "cors";
import * as googleTranslate from "@google-cloud/translate";
import { parse } from "csv-parse/sync";
import * as _ from "lodash";

function BlockList() {
  const list = [];
  const timeoutMap = {};

  const includes = (ip) => {
    if (ip === "::1") {
      return list.includes("::ffff:127.0.0.1");
    }
    return list.includes(ip);
  };

  const remove = (ip) => {
    if (includes(ip)) {
      list.splice(list.indexOf(ip));
    }
  };

  const add = (ip) => {
    if (!includes(ip)) {
      list.push(ip);
      if (timeoutMap[ip]) {
        clearTimeout(timeoutMap[ip]);
      }
      timeoutMap[ip] = setTimeout(() => {
        remove(ip);
      }, 5 * 60 * 1000);
    }
  };

  return { includes, add, remove };
}

const blockList = BlockList();

const DB_FILE_NAME = "db.json";
const file = join(process.env.DB_LOCATION || process.cwd(), DB_FILE_NAME);

console.log("storage location:", file);

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

app.get("/localizations/:locale", (req, res, next) => {
  if (req.params.locale === "config") {
    next();
  } else {
    let lang;
    if (req.query.exact !== "true") {
      if (blockList.includes(req.ip)) {
        res.send({});
      } else {
        lang = req.params.locale.replace(".json", "");
        const regex = /([a-z]{2})_[A-Z]{2}/;
        if (!db.data[lang] && regex.test(lang)) {
          lang = regex.exec(lang)[1];
        }
        return res.send(db.data[lang] || {});
      }
    } else {
      return res.send(db.data[req.params.locale] || {});
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

const getConfig = () => {
  return {
    ...(db.data.config || {}),
    translateAvailable: !!process.env.GOOGLE_API_KEY,
  };
};

const setConfigValue = async (key, value) => {
  const config = getConfig();
  config[key] = value;
  db.data.config = _.omit(config, "translateAvailable");
  await db.write();
};

app.get("/localizations/config", (_, res) => {
  return res.send(getConfig());
});

app.get("/localizations/config/block", (req, res) => {
  return res.send(blockList.includes(req.ip));
});

app.put("/localizations/config/block", (req, res) => {
  blockList.add(req.ip);
  return res.sendStatus(204);
});

app.delete("/localizations/config/block", (req, res) => {
  blockList.remove(req.ip);
  return res.sendStatus(204);
});

app.get("/localizations/config/:key", (req, res) => {
  const data = getConfig()[req.params.key];
  return res.send(data);
});

app.post("/localizations/config/:key", async (req, res) => {
  let value = req.body;
  if (typeof value === "string") {
    if ("true" === value?.toLowerCase()) {
      value = true;
    } else if ("false" === value?.toLowerCase()) {
      value = false;
    }
  }
  await setConfigValue(req.params.key, value);
  return res.sendStatus(204);
});

app.post("/localizations/import/:locale", async (req, res) => {
  if (assertFormat(req, "text/plain", res)) {
    if (!req.query.type) {
      return res
        .status(400)
        .send(
          "Query parameter 'type' is required. Options: replace, overwrite, add"
        );
    }

    if (!["replace", "overwrite", "add"].some((t) => t === req.query.type)) {
      return res
        .status(400)
        .send(
          "Value for query parameter 'type' is not supported. Options: replace, overwrite, add"
        );
    }

    let data;
    try {
      data = JSON.parse(req.body);
    } catch (e1) {
      try {
        data = parse(req.body, {
          delimiter: ";",
          encoding: "utf-8",
          recordDelimiter: ["\n", "\r", "\r\n"],
          skip_empty_lines: true,
        }).reduce(
          (acc, [key, , translation]) => ({ ...acc, [key]: translation }),
          {}
        );
      } catch (e2) {
        console.error(e2);
        return res.status(400).send("Could not parse CSV or JSON content");
      }
    }

    if (!Object.keys(data).length) {
      return req
        .status(400)
        .send("Could not parse any data in the CSV or JSON content");
    }

    if (!db.data[req.params.locale]) {
      db.data[req.params.locale] = {};
    }

    switch (req.query.type) {
      case "replace":
        db.data[req.params.locale] = data;
        break;

      case "overwrite":
        db.data[req.params.locale] = { ...db.data[req.params.locale], ...data };
        break;

      case "add":
        db.data[req.params.locale] = { ...data, ...db.data[req.params.locale] };
        break;

      default:
        return res.sendStatus(400);
    }

    await db.write();
    return res.sendStatus(204);
  }
});

app.post("/localizations/:locale", async (req, res) => {
  if (assertFormat(req, "application/json", res)) {
    db.data[req.params.locale] = req.body;
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

app.delete("/localizations/:locale/:key", async (req, res) => {
  if (!db.data[req.params.locale]) {
    db.data[req.params.locale] = {};
  }
  console.log("delete", req.params.locale, req.params.key);
  db.data[req.params.locale][req.params.key] = undefined;
  await db.write();
  return res.sendStatus(204);
});

// </DB>

// <TRANSLATE>

app.post("/translate", async (req, res) => {
  const googleAPIKey = process.env.GOOGLE_API_KEY;

  if (!googleAPIKey) {
    return res.status(400).send("No Google translate API key is set.");
  }

  if (assertFormat(req, "application/json", res)) {
    const tr = new googleTranslate.v2.Translate({
      key: googleAPIKey,
    });
    try {
      const translation = await tr.translate(
        req.body.text,
        req.body.lang.replace(/_.*$/, "")
      );
      return res.send(translation?.[0]);
    } catch (err) {
      console.error(err);
      return res.status(400).send(err.message);
    }
  }
});

// </TRANSLATE>

app.use((_, res) => {
  return res.sendStatus(404);
});

app.listen(8000, () => {
  console.log("PWA translation manager listening");
});
