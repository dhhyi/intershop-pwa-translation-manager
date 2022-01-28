import express from "express";
import { join } from "path";
import { mkdirSync, existsSync } from "fs";
import { Low, JSONFile, Memory } from "lowdb";
import cors from "cors";
import * as googleTranslate from "@google-cloud/translate";
import { parse } from "csv-parse/sync";
import _ from "lodash";

// <INIT>

if (process.env.SILENT === "true") {
  console.log = () => {};
}

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

const folder = process.env.DB_LOCATION;
console.log("storage location:", folder);

function BackEnd(dbName) {
  let adapter;

  if (folder) {
    if (!existsSync(folder)) {
      mkdirSync(folder, { recursive: true });
    }

    const file = join(folder, dbName + ".json");

    console.log("using json file storage for", dbName);
    adapter = new JSONFile(file);
  } else {
    console.log("using memory storage for", dbName);
    adapter = new Memory();
  }
  const db = new Low(adapter);

  return db;
}

async function init(db) {
  await db.read();
  db.data = db.data || {};
  await db.write();
  return db;
}

const localizations = await init(BackEnd("db"));

Object.entries(localizations.data).forEach(([lang, translations]) => {
  console.log(
    "loaded localization",
    lang,
    "-",
    Object.keys(translations).length,
    "keys"
  );
});
if (!Object.entries(localizations.data).length) {
  console.log("no localization data available");
}

const config = await init(BackEnd("config"));

const getConfig = (req) => {
  const data = config.data || {};
  data.translateAvailable = !!process.env.GOOGLE_API_KEY;
  if (req) {
    data.block = blockList.includes(req.ip);
  }
  data.baseLang = data.baseLang ?? "en";
  data.languages = (data.locales || [])
    .map((locale) => /^([a-z]+)/.exec(locale)?.[1])
    .filter((v, i, a) => !!v && a.indexOf(v) === i)
    .sort();
  return data;
};

function logConfig() {
  console.log("new config", JSON.stringify(getConfig(), undefined, ""));
}
logConfig();

const configReadOnlyFields = ["translateAvailable", "languages"];

const setConfigValue = async (key, value) => {
  const configData = getConfig();
  configData[key] = value;
  config.data = _.omit(configData, ...configReadOnlyFields, "block");
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

// <TESTING>

if (process.env.TESTING === "true") {
  app.delete("/db", async (_, res) => {
    console.log("DELETE DB");

    config.data = {};
    await config.write();

    localizations.data = {};
    await localizations.write();

    return res.sendStatus(204);
  });
}

// </TESTING>

// <OPEN-DB>

app.use(cors());

const ID =
  ":lang([a-zA-Z0-9]+)" +
  ":div1([-_])?" +
  ":country([a-zA-Z0-9]+)?" +
  ":div2([-_\\/])?" +
  ":theme([a-zA-Z0-9]+)?" +
  "(.json)?";

function parseID(params) {
  const lang = params.lang?.toLowerCase();
  const country = params.country?.toUpperCase();
  const theme = params.theme?.toLowerCase();

  const config = getConfig();

  if (!(config.languages || []).includes(lang)) {
    return { error: "Language " + lang + " is not configured." };
  } else if (
    country &&
    !(config.locales || []).includes(`${lang}_${country}`)
  ) {
    return { error: "Locale " + locale + " is not configured." };
  } else if (theme && !(config.themes || []).includes(theme)) {
    return { error: "Theme " + theme + " is not configured." };
  } else {
    let id = lang;
    if (country) {
      id += "_" + country;
    }
    if (theme) {
      id += "-" + theme;
    }

    let path = [lang];
    if (theme) {
      path.push(`${lang}-${theme}`);
    }
    if (country) {
      path.push(`${lang}_${country}`);
      if (theme) {
        path.push(`${lang}_${country}-${theme}`);
      }
    }

    return { id, path };
  }
}

function getLocalizations(parsed, req) {
  if (req.query.unblocked !== "true" && blockList.includes(req.ip)) {
    res.send({});
  } else {
    if (req.query.exact === "true") {
      return localizations.data[parsed.id] || {};
    } else {
      return parsed.path
        .map((id) => localizations.data[id] || {})
        .reduce((acc, val) => ({ ...acc, ...val }), {});
    }
  }
}

app.get(`/localizations/${ID}/:key`, (req, res, next) => {
  const themes = getConfig(req).themes || [];
  if (themes.includes(req.params.key.replace(/\.json$/, ""))) {
    next();
  } else {
    const parsed = parseID(req.params);
    if (parsed.error) {
      return res.status(400).send(parsed.error);
    }

    const data = getLocalizations(parsed, req)[req.params.key];
    if (data) {
      return res.set("content-type", "text/plain").send(data);
    }
    return res.sendStatus(404);
  }
});

app.get(`/localizations/${ID}`, (req, res) => {
  const parsed = parseID(req.params);
  if (parsed.error) {
    return res.status(400).send(parsed.error);
  }

  res.send(getLocalizations(parsed, req));
});

app.get("/list", (req, res) => {
  const config = getConfig();

  let links;

  switch (req.query.query) {
    case "combinations":
      if (!Object.keys(config.combinations || {}).length) {
        return res.status(400).send("No combinations are configured.");
      }
    case "all":
      if (!config.themes?.length) {
        return res.status(400).send("No themes are configured.");
      }
    default:
      if (!config.locales?.length) {
        return res.status(400).send("No locales are configured.");
      }
  }

  const newQuery = Object.entries(
    _.omit({ unblocked: true, ...req.query }, "query")
  )
    .map(([k, v]) => `${k}=${v}`)
    .join("&");
  const url = (locale, theme) =>
    `${req.protocol}://${req.get("host")}/localizations/${locale}${
      theme ? "/" + theme : ""
    }?${newQuery}`;
  const id = (locale, theme) => `${locale}${theme ? "-" + theme : ""}`;

  switch (req.query.query) {
    case "combinations":
      const combinations = _.flatten(
        Object.entries(config.combinations).map(([locale, themes]) =>
          themes.map((theme) => ({ locale, theme }))
        )
      );

      combinations.push(
        ...combinations
          .map(({ locale, theme }) => ({
            locale: /^[a-z]+/.exec(locale)[0],
            theme,
          }))
          .filter(
            ({ locale: l, theme: t }, i, a) =>
              a.findIndex((v) => v.locale === l && v.theme === t) === i
          )
      );

      combinations.push(...config.languages.map((locale) => ({ locale })));

      combinations.push(...config.locales.map((locale) => ({ locale })));

      links = _.sortBy(
        combinations.map(({ locale, theme }) => ({
          id: id(locale, theme),
          url: url(locale, theme),
        })),
        "id"
      );
      break;

    case "locale":
      links = [...config.locales].sort().map((id) => ({ id, url: url(id) }));
      break;

    default:
      links = [...config.languages].sort().map((id) => ({ id, url: url(id) }));
      break;
  }

  return res.send(links);
});

// </OPEN-DB>

const API_PASSWORD = process.env.API_PASSWORD;

app.use(express.json({ limit: "10mb", extended: true }));
app.use(express.text({ limit: "10mb", extended: true }));

app.use((req, res, next) => {
  if (API_PASSWORD && req.get("Authorization") !== API_PASSWORD) {
    return res.sendStatus(401);
  }
  next();
});

function assertFormat(req, res, ...formats) {
  if (!formats.some((format) => req.get("Content-Type") === format)) {
    res
      .status(400)
      .send(
        `Only Content-Type ${formats
          .map((x) => `"${x}"`)
          .join()} is allowed here! Received "${req.get("Content-Type")}"`
      );
    return false;
  }
  return true;
}

// <DB>

app.put(`/localizations/${ID}/:key`, async (req, res) => {
  if (assertFormat(req, res, "text/plain")) {
    const parsed = parseID(req.params);
    if (parsed.error) {
      return res.status(400).send(parsed.error);
    }
    if (!localizations.data[parsed.id]) {
      localizations.data[parsed.id] = {};
    }
    const key = req.params.key;
    const body = req.body;

    console.log("set", parsed.id, key, "=", body);
    localizations.data[parsed.id][key] = body;

    await localizations.write();
    return res.sendStatus(204);
  }
});

app.delete(`/localizations/${ID}/:key`, async (req, res) => {
  const parsed = parseID(req.params);
  if (parsed.error) {
    return res.status(400).send(parsed.error);
  }
  if (!localizations.data[parsed.id]) {
    localizations.data[parsed.id] = {};
  }
  const key = req.params.key;

  console.log("delete", parsed.id, key);
  localizations.data[parsed.id][key] = undefined;

  await localizations.write();
  return res.sendStatus(204);
});

// </DB>

// <IMPORT>

app.post(`/import/${ID}`, async (req, res) => {
  if (assertFormat(req, res, "text/plain", "application/json")) {
    const parsed = parseID(req.params);
    if (parsed.error) {
      return res.status(400).send(parsed.error);
    }

    const type = req.query.type;
    const options = ["replace", "overwrite", "add"];
    if (!type) {
      return res
        .status(400)
        .send(
          "Query parameter 'type' is required. Options: " + options.join(", ")
        );
    }

    if (!options.some((t) => t === type)) {
      return res
        .status(400)
        .send(
          "Value for query parameter 'type' is not supported. Options: " +
            options.join(", ")
        );
    }

    let data;

    if (typeof req.body === "object") {
      data = req.body;
    } else {
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
    }

    if (!Object.keys(data).length) {
      return res
        .status(400)
        .send("Could not parse any data in the CSV or JSON content");
    }

    if (!localizations.data[parsed.id]) {
      localizations.data[parsed.id] = {};
    }

    console.log("importing", parsed.id, "with strategy", type);

    let message;
    switch (type) {
      case "replace":
        localizations.data[parsed.id] = data;
        message = `Imported ${Object.keys(data).length} keys.`;
        break;

      case "overwrite":
        localizations.data[parsed.id] = {
          ...localizations.data[parsed.id],
          ...data,
        };
        message = `Imported ${Object.keys(data).length} keys.`;
        break;

      case "add":
        const originalKeys = Object.keys(localizations.data[parsed.id]);
        localizations.data[parsed.id] = {
          ...data,
          ...localizations.data[parsed.id],
        };
        message = `Imported ${
          Object.keys(data).filter((k) => !originalKeys.includes(k)).length
        } keys.`;
        break;

      default:
        return res.sendStatus(400);
    }

    await localizations.write();
    return res.status(200).send(message);
  }
});

app.delete(`/import/${ID}`, async (req, res) => {
  const parsed = parseID(req.params);
  if (parsed.error) {
    return res.status(400).send(parsed.error);
  }

  localizations.data[parsed.id] = undefined;
  await localizations.write();
  return res.send(`Deleted all keys.`);
});

// </IMPORT>

// <CONFIG>

app.get("/config", (req, res) => {
  return res.send(getConfig(req));
});

app.get("/config/:key", (req, res) => {
  const data = getConfig(req)[req.params.key];
  if (data === undefined) {
    return res.sendStatus(404);
  }
  return res.send(data);
});

function normalizeLocale(input) {
  const match = /^([a-zA-Z]{2,3})[^a-zA-Z0-9]([a-zA-Z0-9]{2,3})$/.exec(input);
  if (!match) {
    return false;
  }
  return `${match[1].toLowerCase()}_${match[2].toUpperCase()}`;
}

function parseArray(input) {
  return (
    input &&
    input
      .split(/[,;]/)
      .map((v) => v?.trim())
      .filter((v) => !!v)
  );
}

function checkConfigValue(key, value) {
  if (key === "locales") {
    let parsed = value;
    if (typeof value === "string") {
      parsed = parseArray(value);
    } else if (!Array.isArray(value)) {
      return { error: `Could not set ${key}.` };
    }

    const errors = [];
    parsed = parsed.map((v) => {
      const p = normalizeLocale(v);
      if (!p) {
        errors.push(`Cannot parse "${v}" as locale.`);
      }
      return p;
    });
    if (errors.length) {
      return { error: "Could not set locales. " + errors.join(" ") };
    }

    return { value: parsed };
  } else if (key === "themes") {
    let parsed = value;
    if (typeof value === "string") {
      parsed = parseArray(value);
    } else if (!Array.isArray(value)) {
      return { error: `Could not set ${key}.` };
    }

    return { value: parsed };
  } else if (key === "combinations") {
    const config = getConfig();
    const locales = config.locales || [];
    const themes = config.themes || [];

    const newCombinations = {};

    for (const [cl, cts] of Object.entries(value)) {
      const locale = normalizeLocale(cl);
      if (!locales.includes(locale)) {
        return { error: `Locale "${cl}" is not configured.` };
      }
      for (const th of cts) {
        if (!themes.includes(th)) {
          return { error: `Theme "${th}" is not configured.` };
        }
      }

      newCombinations[locale] = cts.sort();
    }
    return { value: newCombinations };
  } else {
    return { value };
  }
}

app.post("/config", async (req, res) => {
  if (assertFormat(req, res, "application/json")) {
    const newConfig = {};
    for (const key in req.body) {
      const value = req.body[key];
      const parsed = checkConfigValue(key, value);
      if (parsed.error) {
        return res.status(400).send(parsed.error);
      }
      newConfig[key] = parsed.value;
    }

    config.data = newConfig;
    await config.write();
    logConfig();
    return res.sendStatus(204);
  }
});

app.put("/config/:key", async (req, res, next) => {
  const key = req.params.key;
  if (key === "block") {
    blockList.add(req.ip);
    return res.sendStatus(204);
  } else if (configReadOnlyFields.includes(key)) {
    next();
  } else {
    let value = req.body;
    if (typeof value === "string") {
      if ("true" === value?.toLowerCase()) {
        value = true;
      } else if ("false" === value?.toLowerCase()) {
        value = false;
      }
    }

    const parsed = checkConfigValue(key, value);
    if (parsed.error) {
      return res.status(400).send(parsed.error);
    }

    await setConfigValue(key, parsed.value);
    return res.sendStatus(204);
  }
});

app.delete("/config/:key", async (req, res, next) => {
  if (req.params.key === "block") {
    blockList.remove(req.ip);
    return res.sendStatus(204);
  } else if (configReadOnlyFields.includes(req.params.key)) {
    next();
  } else {
    await setConfigValue(req.params.key, undefined);
    return res.sendStatus(204);
  }
});

// </CONFIG>

// <TRANSLATE>

app.post("/translate", async (req, res) => {
  const googleAPIKey = process.env.GOOGLE_API_KEY;

  if (!googleAPIKey) {
    return res.status(400).send("No Google translate API key is set.");
  }

  if (assertFormat(req, res, "application/json")) {
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

app.get((_, res) => {
  return res.sendStatus(404);
});
app.use((_, res) => {
  return res.sendStatus(405);
});

app.listen(+process.env.PORT || 8000, () => {
  console.log("PWA translation manager listening");
});
