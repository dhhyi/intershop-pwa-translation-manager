import express from "express";
import { join } from "path";
import { mkdirSync, existsSync } from "fs";
import { Low, JSONFile } from "lowdb";
import cors from "cors";
import * as googleTranslate from "@google-cloud/translate";
import { parse } from "csv-parse/sync";
import _ from "lodash";

// <INIT>

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

function BackEnd(dbFileName) {
  const folder = process.env.DB_LOCATION || process.cwd();
  if (!existsSync(folder)) {
    mkdirSync(folder, { recursive: true });
  }

  const file = join(folder, dbFileName);

  console.log("storage location:", file);

  const adapter = new JSONFile(file);
  const db = new Low(adapter);

  return db;
}

async function init(db) {
  await db.read();
  db.data = db.data || {};
  await db.write();
  return db;
}

const localizations = await init(BackEnd("db.json"));

Object.entries(localizations.data).forEach(([lang, translations]) => {
  console.log("loaded", lang, "-", Object.keys(translations).length, "keys");
});
if (!Object.entries(localizations.data).length) {
  console.log("no data available");
}

const config = await init(BackEnd("config.json"));

const getConfig = (req) => {
  const data = config.data || {};
  data.translateAvailable = !!process.env.GOOGLE_API_KEY;
  if (req) {
    data.block = blockList.includes(req.ip);
  }
  return data;
};

function logConfig() {
  console.log("new config", JSON.stringify(getConfig(), undefined, ""));
}
logConfig();

const configReadOnlyFields = ["translateAvailable"];

const setConfigValue = async (key, value) => {
  const configData = getConfig();
  configData[key] = value;
  config.data = _.omit(configData, "translateAvailable");
  await config.write();
  logConfig();
};

const app = express();

// </INIT>

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
        if (!localizations.data[lang] && regex.test(lang)) {
          lang = regex.exec(lang)[1];
        }
        return res.send(localizations.data[lang] || {});
      }
    } else {
      return res.send(localizations.data[req.params.locale] || {});
    }
  }
});

app.get("/localizations/:locale/:key", (req, res, next) => {
  if (req.params.locale === "config") {
    next();
  } else {
    const data = localizations.data[req.params.locale]?.[req.params.key];
    if (data) {
      return res.send(data);
    }
    return res.sendStatus(404);
  }
});

app.get("/list", (req, res) => {
  const languages = getConfig()?.languages || [];
  const languagesWithURL = languages.map((lang) => ({
    lang,
    url: `${req.protocol}://${req.get(
      "host"
    )}/localizations/${lang}?exact=true`,
  }));
  return res.send(languagesWithURL);
});

// </OPEN-DB>

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

// <DB>

app.get("/localizations", (_, res) => {
  return res.send(localizations.data);
});

app.post("/localizations", async (req, res) => {
  if (assertFormat(req, "application/json", res)) {
    localizations.data = req.body;
    await localizations.write();
    return res.sendStatus(204);
  }
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

    if (!localizations.data[req.params.locale]) {
      localizations.data[req.params.locale] = {};
    }

    switch (req.query.type) {
      case "replace":
        localizations.data[req.params.locale] = data;
        break;

      case "overwrite":
        localizations.data[req.params.locale] = {
          ...localizations.data[req.params.locale],
          ...data,
        };
        break;

      case "add":
        localizations.data[req.params.locale] = {
          ...data,
          ...localizations.data[req.params.locale],
        };
        break;

      default:
        return res.sendStatus(400);
    }

    await localizations.write();
    return res.sendStatus(204);
  }
});

app.post("/localizations/:locale", async (req, res) => {
  if (assertFormat(req, "application/json", res)) {
    localizations.data[req.params.locale] = req.body;
    await localizations.write();
    return res.sendStatus(204);
  }
});

app.post("/localizations/:locale/:key", async (req, res) => {
  if (assertFormat(req, "text/plain", res)) {
    if (!localizations.data[req.params.locale]) {
      localizations.data[req.params.locale] = {};
    }
    console.log("set", req.params.locale, req.params.key, "=", req.body);
    localizations.data[req.params.locale][req.params.key] = req.body;
    await localizations.write();
    return res.sendStatus(204);
  }
});

app.delete("/localizations/:locale/:key", async (req, res) => {
  if (!localizations.data[req.params.locale]) {
    localizations.data[req.params.locale] = {};
  }
  console.log("delete", req.params.locale, req.params.key);
  localizations.data[req.params.locale][req.params.key] = undefined;
  await localizations.write();
  return res.sendStatus(204);
});

// </DB>

// <CONFIG>

app.get("/config", (req, res) => {
  return res.send(getConfig(req));
});

app.post("/config", async (req, res) => {
  if (assertFormat(req, "application/json", res)) {
    config.data = req.body;
    await config.write();
    logConfig();
    return res.sendStatus(204);
  }
});

app.get("/config/:key", (req, res) => {
  const data = getConfig(req)[req.params.key];
  if (data === undefined) {
    return res.sendStatus(404);
  }
  return res.send(data);
});

app.put("/config/:key", async (req, res) => {
  let value = req.body;
  if (typeof value === "string") {
    if ("true" === value?.toLowerCase()) {
      value = true;
    } else if ("false" === value?.toLowerCase()) {
      value = false;
    }
  }

  if (req.params.key === "block") {
    blockList.add(req.ip);
  } else if (configReadOnlyFields.includes(req.params.key)) {
    return res.sendStatus(405);
  } else {
    await setConfigValue(req.params.key, value);
  }
  return res.sendStatus(204);
});

app.delete("/config/:key", async (req, res) => {
  if (req.params.key === "block") {
    blockList.remove(req.ip);
  } else if (configReadOnlyFields.includes(req.params.key)) {
    return res.sendStatus(405);
  } else {
    await setConfigValue(req.params.key, undefined);
  }
  return res.sendStatus(204);
});

// </CONFIG>

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
