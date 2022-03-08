import express from "express";
import { join } from "path";
import { mkdirSync, existsSync } from "fs";
import { Low, JSONFile, Memory } from "lowdb";
import cors from "cors";
import * as googleTranslate from "@google-cloud/translate";
import { parse } from "csv-parse/sync";
import _ from "lodash";

// <INIT>

class ConfigError extends Error {}
class UsageError extends Error {}

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

app.get(["/", "/key/:key"], (req, _, next) => {
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

function getLocales() {
  const config = getConfig();
  if (!config.locales?.length) {
    throw new ConfigError("No locales are configured.");
  }
  return [...config.locales].sort().map((locale) => {
    const [lang, country] = locale.split("_");
    return { lang, country };
  });
}

function getLanguages() {
  const config = getConfig();
  if (!config.locales?.length) {
    throw new ConfigError("No locales are configured.");
  }
  return [...config.languages].sort();
}

function getThemes() {
  const config = getConfig();
  if (!config.themes?.length) {
    throw new ConfigError("No themes are configured.");
  }
  return [...config.themes].sort();
}

function getCombinations() {
  const config = getConfig();

  let combinations = [];
  if (Object.keys(config.combinations || {}).length) {
    combinations.push(
      ..._.flatten(
        Object.entries(config.combinations).map(([locale, themes]) => {
          const [lang, country] = locale.split("_");
          return themes.map((theme) => ({ lang, country, theme }));
        })
      )
    );

    combinations.push(
      ...combinations
        .map(({ lang, theme }) => ({ lang, theme }))
        .filter(
          ({ lang: l, theme: t }, i, a) =>
            a.findIndex((v) => v.lang === l && v.theme === t) === i
        )
    );
  } else if (config.themes?.length) {
    const themes = getThemes();

    combinations.push(
      ..._.flatten(
        getLocales().map(({ lang, country }) =>
          themes.map((theme) => ({ lang, country, theme }))
        )
      )
    );

    combinations.push(
      ..._.flatten(
        config.languages.map((lang) => themes.map((theme) => ({ lang, theme })))
      )
    );
  }

  combinations.push(...config.languages.map((lang) => ({ lang })));

  combinations.push(
    ...getLocales().map(({ lang, country }) => ({ lang, country }))
  );

  return combinations;
}

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

  if (!getLanguages().includes(lang)) {
    throw new ConfigError("Language " + lang + " is not configured.");
  } else if (
    country &&
    !getLocales().find((l) => l.lang === lang && l.country === country)
  ) {
    throw new ConfigError("Locale " + locale + " is not configured.");
  } else if (theme && !getThemes().includes(theme)) {
    throw new ConfigError("Theme " + theme + " is not configured.");
  } else {
    let id = lang;
    let locale;
    if (country) {
      id += "_" + country;
      locale = id;
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

    return { id, path, locale, lang, country, theme };
  }
}

function getLocalizations(parsed, exact = false) {
  if (exact) {
    return localizations.data[parsed.id] || {};
  } else {
    return parsed.path
      .map((id) => localizations.data[id] || {})
      .reduce((acc, val) => ({ ...acc, ...val }), {});
  }
}

app.get(`/localizations/${ID}/:key`, (req, res, next) => {
  try {
    const themes = getConfig(req).themes || [];
    if (themes.includes(req.params.key.replace(/\.json$/, ""))) {
      next();
    } else {
      const data = getLocalizations(
        parseID(req.params),
        req.query.exact === "true"
      )[req.params.key];
      if (data) {
        return res.set("content-type", "text/plain").send(data);
      }
      return res.sendStatus(404);
    }
  } catch (error) {
    next(error);
  }
});

app.get(`/localizations/${ID}`, (req, res, next) => {
  try {
    if (req.query.unblocked !== "true" && blockList.includes(req.ip)) {
      res.send({});
    } else {
      res.send(
        getLocalizations(parseID(req.params), req.query.exact === "true")
      );
    }
  } catch (error) {
    next(error);
  }
});

app.get("/list", (req, res, next) => {
  try {
    const newQuery = Object.entries(
      _.omit({ unblocked: true, ...req.query }, "query")
    )
      .map(([k, v]) => `${k}=${v}`)
      .join("&");

    const makeLink = (params) => {
      const { id, lang, locale, theme } = parseID(params);
      return {
        id,
        url: `${req.protocol}://${req.get("host")}/localizations/${
          locale || lang
        }${theme ? "/" + theme : ""}?${newQuery}`,
      };
    };

    let links;
    switch (req.query.query) {
      case "combinations":
        links = getCombinations().map(makeLink);
        break;

      case "locale":
        links = getLocales().map(makeLink);
        break;

      default:
        links = getLanguages()
          .map((lang) => ({ lang }))
          .map(makeLink);
        break;
    }

    return res.send(_.sortBy(links, "id"));
  } catch (error) {
    next(error);
  }
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

function assertFormat(req, ...formats) {
  if (!formats.some((format) => req.get("Content-Type") === format)) {
    throw new UsageError(
      `Only Content-Type ${formats
        .map((x) => `"${x}"`)
        .join()} is allowed here! Received "${req.get("Content-Type")}"`
    );
  }
}

// <DB>

app.put(`/localizations/${ID}/:key`, async (req, res, next) => {
  try {
    assertFormat(req, res, "text/plain");
    const { id } = parseID(req.params);
    if (!localizations.data[id]) {
      localizations.data[id] = {};
    }
    const key = req.params.key;
    const body = req.body;

    console.log("set", id, key, "=", body);
    localizations.data[id][key] = body;

    await localizations.write();
    return res.sendStatus(204);
  } catch (error) {
    next(error);
  }
});

app.delete(`/localizations/${ID}/:key`, async (req, res, next) => {
  try {
    const { id } = parseID(req.params);
    if (!localizations.data[id]) {
      localizations.data[id] = {};
    }
    const key = req.params.key;

    console.log("delete", id, key);
    delete localizations.data[id][key];

    await localizations.write();
    return res.sendStatus(204);
  } catch (error) {
    next(error);
  }
});

// </DB>

// <OVERRIDES>

app.get("/overrides-list/:lang?", (req, res, next) => {
  try {
    let combinations = getCombinations();
    if (req.params.lang) {
      parseID(req.params);
      combinations = combinations.filter((c) => c.lang === req.params.lang);
    }
    combinations = combinations.filter((c) => !!c.theme || !!c.country);

    const keys = _.flatten(
      combinations
        .map((params) => parseID(params)?.id)
        .map((id) => Object.keys(localizations.data[id] || {}))
    ).filter((v, i, a) => a.indexOf(v) === i);

    return res.send(keys);
  } catch (error) {
    next(error);
  }
});

app.get("/overrides/:lang?/:key", (req, res, next) => {
  try {
    let combinations = getCombinations();
    if (req.params.lang) {
      parseID(req.params);
      combinations = combinations.filter((c) => c.lang === req.params.lang);
    }

    const makeLink = (params) => {
      const { id, lang, locale, theme, path, country } = parseID(params);
      let updateLang = locale || lang;
      if (theme) {
        updateLang += "/" + theme;
      }
      const base = `${req.protocol}://${req.get("host")}`;
      return {
        id,
        updateLang,
        lang,
        country,
        locale,
        theme,
        url: `${base}/localizations/${updateLang}/${req.params.key}`,
        interpolated: getLocalizations({ id, path })[req.params.key],
        value: getLocalizations({ id, path }, true)[req.params.key],
      };
    };

    return res.send(_.sortBy(combinations.map(makeLink), "id"));
  } catch (error) {
    next(error);
  }
});

// </OVERRIDES>

// <IMPORT>

app.post(`/import/${ID}`, async (req, res, next) => {
  try {
    assertFormat(req, res, "text/plain", "application/json");
    const { id } = parseID(req.params);
    const type = req.query.type;
    const options = ["replace", "overwrite", "add"];
    if (!type) {
      throw new UsageError(
        "Query parameter 'type' is required. Options: " + options.join(", ")
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
            encoding: "utf-8",
            recordDelimiter: ["\n", "\r", "\r\n"],
            skip_empty_lines: true,
          }).reduce(
            (acc, [key, , translation]) => ({ ...acc, [key]: translation }),
            {}
          );

          if (Object.keys(data).some((k) => k.includes(";"))) {
            throw new UsageError("CSV with semicolons");
          }
        } catch (e2) {
          try {
            console.log("retry with semicolons");
            data = parse(req.body, {
              encoding: "utf-8",
              delimiter: ";",
              recordDelimiter: ["\n", "\r", "\r\n"],
              skip_empty_lines: true,
            }).reduce(
              (acc, [key, , translation]) => ({ ...acc, [key]: translation }),
              {}
            );
          } catch (e3) {
            console.error(e3);
            throw new UsageError("Could not parse CSV or JSON content");
          }
        }
      }
    }

    // remove empty keys
    Object.entries(data).forEach(([k, v]) => {
      if (!v) {
        delete data[k];
      }
    });

    if (!Object.keys(data).length) {
      throw new UsageError(
        "Could not parse any data in the CSV or JSON content"
      );
    }

    if (!localizations.data[id]) {
      localizations.data[id] = {};
    }

    console.log("importing", id, "with strategy", type);

    let message;
    switch (type) {
      case "replace":
        localizations.data[id] = data;
        message = `Imported ${Object.keys(data).length} keys.`;
        break;

      case "overwrite":
        localizations.data[id] = {
          ...localizations.data[id],
          ...data,
        };
        message = `Imported ${Object.keys(data).length} keys.`;
        break;

      case "add":
        const originalKeys = Object.keys(localizations.data[id]);
        localizations.data[id] = {
          ...data,
          ...localizations.data[id],
        };
        message = `Imported ${
          Object.keys(data).filter((k) => !originalKeys.includes(k)).length
        } keys.`;
        break;

      default:
        throw new UsageError(
          "Value for query parameter 'type' is not supported. Options: " +
            options.join(", ")
        );
    }

    await localizations.write();
    return res.status(200).send(message);
  } catch (error) {
    next(error);
  }
});

app.delete(`/import/${ID}`, async (req, res, next) => {
  try {
    const { id } = parseID(req.params);
    localizations.data[id] = undefined;
    await localizations.write();
    return res.send(`Deleted all keys.`);
  } catch (error) {
    next(error);
  }
});

// </IMPORT>

// <CONFIG>

app.get("/config", (req, res, next) => {
  try {
    return res.send(getConfig(req));
  } catch (error) {
    next(error);
  }
});

app.get("/config/:key", (req, res, next) => {
  try {
    const data = getConfig(req)[req.params.key];
    if (data === undefined) {
      return res.sendStatus(404);
    }
    return res.send(data);
  } catch (error) {
    next(error);
  }
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
      throw new ConfigError(`Could not set ${key}.`);
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
      throw new ConfigError("Could not set locales. " + errors.join(" "));
    }

    return parsed;
  } else if (key === "themes" || key === "ignored") {
    let parsed = value;
    if (typeof value === "string") {
      parsed = parseArray(value);
    } else if (!Array.isArray(value)) {
      throw new ConfigError(`Could not set ${key}.`);
    }

    return parsed;
  } else if (key === "combinations") {
    const config = getConfig();
    const locales = config.locales || [];
    const themes = config.themes || [];

    const newCombinations = {};

    for (const [cl, cts] of Object.entries(value)) {
      const locale = normalizeLocale(cl);
      if (!locales.includes(locale)) {
        throw new ConfigError(`Locale "${cl}" is not configured.`);
      }
      for (const th of cts) {
        if (!themes.includes(th)) {
          throw new ConfigError(`Theme "${th}" is not configured.`);
        }
      }

      newCombinations[locale] = cts.sort();
    }
    return newCombinations;
  } else if (key === "baseLang") {
    if (typeof value !== "string") {
      throw new ConfigError(`Could not set ${key}.`);
    } else if (!/^[a-zA-Z]+$/.test(value)) {
      throw new ConfigError(`Could not set ${key}.`);
    }
    return value.toLowerCase();
  } else {
    return value;
  }
}

app.post("/config", async (req, res, next) => {
  try {
    assertFormat(req, res, "application/json");
    const newConfig = {};
    for (const key in req.body) {
      const value = req.body[key];
      const parsed = checkConfigValue(key, value);
      newConfig[key] = parsed;
    }

    config.data = newConfig;
    await config.write();
    logConfig();
    return res.sendStatus(204);
  } catch (error) {
    next(error);
  }
});

app.put("/config/:key", async (req, res, next) => {
  try {
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
      await setConfigValue(key, parsed);
      return res.sendStatus(204);
    }
  } catch (error) {
    next(error);
  }
});

app.delete("/config/:key", async (req, res, next) => {
  try {
    if (req.params.key === "block") {
      blockList.remove(req.ip);
      return res.sendStatus(204);
    } else if (configReadOnlyFields.includes(req.params.key)) {
      next();
    } else {
      await setConfigValue(req.params.key, undefined);
      return res.sendStatus(204);
    }
  } catch (error) {
    next(error);
  }
});

// </CONFIG>

// <TRANSLATE>

app.post("/translate", async (req, res, next) => {
  try {
    const googleAPIKey = process.env.GOOGLE_API_KEY;

    if (!googleAPIKey) {
      throw new ConfigError("No Google translate API key is set.");
    }

    assertFormat(req, res, "application/json");
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
      throw new UsageError(err.message);
    }
  } catch (error) {
    next(error);
  }
});

// </TRANSLATE>

app.use((req, res, next) => {
  if (req.method !== "GET") {
    return res.sendStatus(405);
  } else {
    next();
  }
});
app.get((_, res) => {
  return res.sendStatus(404);
});
app.use((err, _req, res, _next) => {
  if (err instanceof ConfigError || err instanceof UsageError) {
    return res.status(400).send(err.message);
  } else {
    console.error(err);
    return res.status(500).send("Internal Server Error: " + err.stack);
  }
});

app.listen(+process.env.PORT || 8000, () => {
  console.log("PWA translation manager listening");
});
