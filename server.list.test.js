const axios = require("axios");

axios.defaults.baseURL = "http://localhost:" + (process.env.PORT || "8001");

axios.interceptors.response.use(
  (response) => response,
  (error) => Promise.resolve(error.response)
);

describe("Server List", () => {
  const baseLang = "en";

  const initialData = {
    foo: "test",
    bar: "test",
  };

  beforeAll(async () => {
    const languagesRes = await axios.put("/config/locales", [
      "en_US",
      "de_DE",
      "de_AT",
      "fr_BE",
      "fr_FR",
      "es_ES",
    ]);
    expect(languagesRes.status).toEqual(204);
    const themesRes = await axios.put("/config/themes", ["b2b", "b2c"]);
    expect(themesRes.status).toEqual(204);

    const baseLangRes = await axios.put("/config/baseLang", baseLang, {
      headers: { "content-type": "text/plain" },
    });
    expect(baseLangRes.status).toEqual(204);

    for (const lang of ["en", "de", "fr", "es"]) {
      const res = await axios.post("/import", initialData, {
        params: {
          locale: lang,
          type: "replace",
        },
      });

      expect(res.data).toEqual("Imported 2 keys.");
      expect(res.status).toEqual(200);
    }
  });

  afterAll(async () => {
    for (const locale of ["en", "de", "fr", "es"]) {
      const res = await axios.delete("/import?locale=" + locale);

      expect(res.data).toEqual("Deleted all keys.");
      expect(res.status).toEqual(200);
    }
  });

  describe("all query", () => {
    let listResponse;

    it("should return all locale X theme links in the list response", async () => {
      listResponse = await axios.get("/list?query=all");
      expect(listResponse.status).toEqual(200);
      expect(listResponse.data).toMatchInlineSnapshot(`
        Array [
          Object {
            "id": "de_AT_b2b",
            "locale": "de_AT",
            "theme": "b2b",
            "url": "http://localhost:8001/localizations/de_AT_b2b?unblocked=true",
          },
          Object {
            "id": "de_AT_b2c",
            "locale": "de_AT",
            "theme": "b2c",
            "url": "http://localhost:8001/localizations/de_AT_b2c?unblocked=true",
          },
          Object {
            "id": "de_DE_b2b",
            "locale": "de_DE",
            "theme": "b2b",
            "url": "http://localhost:8001/localizations/de_DE_b2b?unblocked=true",
          },
          Object {
            "id": "de_DE_b2c",
            "locale": "de_DE",
            "theme": "b2c",
            "url": "http://localhost:8001/localizations/de_DE_b2c?unblocked=true",
          },
          Object {
            "id": "en_US_b2b",
            "locale": "en_US",
            "theme": "b2b",
            "url": "http://localhost:8001/localizations/en_US_b2b?unblocked=true",
          },
          Object {
            "id": "en_US_b2c",
            "locale": "en_US",
            "theme": "b2c",
            "url": "http://localhost:8001/localizations/en_US_b2c?unblocked=true",
          },
          Object {
            "id": "es_ES_b2b",
            "locale": "es_ES",
            "theme": "b2b",
            "url": "http://localhost:8001/localizations/es_ES_b2b?unblocked=true",
          },
          Object {
            "id": "es_ES_b2c",
            "locale": "es_ES",
            "theme": "b2c",
            "url": "http://localhost:8001/localizations/es_ES_b2c?unblocked=true",
          },
          Object {
            "id": "fr_BE_b2b",
            "locale": "fr_BE",
            "theme": "b2b",
            "url": "http://localhost:8001/localizations/fr_BE_b2b?unblocked=true",
          },
          Object {
            "id": "fr_BE_b2c",
            "locale": "fr_BE",
            "theme": "b2c",
            "url": "http://localhost:8001/localizations/fr_BE_b2c?unblocked=true",
          },
          Object {
            "id": "fr_FR_b2b",
            "locale": "fr_FR",
            "theme": "b2b",
            "url": "http://localhost:8001/localizations/fr_FR_b2b?unblocked=true",
          },
          Object {
            "id": "fr_FR_b2c",
            "locale": "fr_FR",
            "theme": "b2c",
            "url": "http://localhost:8001/localizations/fr_FR_b2c?unblocked=true",
          },
        ]
      `);
    });

    it("should return localization data for every list entry", async () => {
      for (const item of listResponse.data) {
        const tr = await axios.get(item.url);
        expect(tr.status).toEqual(200);
        expect(tr.data).toEqual(initialData);
      }
    });
  });

  describe("locale query", () => {
    let listResponse;

    it("should return all locale links in the list response", async () => {
      listResponse = await axios.get("/list?query=locale");
      expect(listResponse.status).toEqual(200);
      expect(listResponse.data).toMatchInlineSnapshot(`
        Array [
          Object {
            "id": "de_AT",
            "url": "http://localhost:8001/localizations/de_AT?unblocked=true",
          },
          Object {
            "id": "de_DE",
            "url": "http://localhost:8001/localizations/de_DE?unblocked=true",
          },
          Object {
            "id": "en_US",
            "url": "http://localhost:8001/localizations/en_US?unblocked=true",
          },
          Object {
            "id": "es_ES",
            "url": "http://localhost:8001/localizations/es_ES?unblocked=true",
          },
          Object {
            "id": "fr_BE",
            "url": "http://localhost:8001/localizations/fr_BE?unblocked=true",
          },
          Object {
            "id": "fr_FR",
            "url": "http://localhost:8001/localizations/fr_FR?unblocked=true",
          },
        ]
      `);
    });

    it("should return localization data for every list entry", async () => {
      for (const item of listResponse.data) {
        const tr = await axios.get(item.url);
        expect(tr.status).toEqual(200);
        expect(tr.data).toEqual(initialData);
      }
    });
  });

  describe("lang query", () => {
    let listResponse;

    it("should return all language links in the list response", async () => {
      listResponse = await axios.get("/list?query=lang");
      expect(listResponse.status).toEqual(200);
      expect(listResponse.data).toMatchInlineSnapshot(`
        Array [
          Object {
            "id": "de",
            "url": "http://localhost:8001/localizations/de?unblocked=true",
          },
          Object {
            "id": "en",
            "url": "http://localhost:8001/localizations/en?unblocked=true",
          },
          Object {
            "id": "es",
            "url": "http://localhost:8001/localizations/es?unblocked=true",
          },
          Object {
            "id": "fr",
            "url": "http://localhost:8001/localizations/fr?unblocked=true",
          },
        ]
      `);
    });

    it("should return localization data for every list entry", async () => {
      for (const item of listResponse.data) {
        const tr = await axios.get(item.url);
        expect(tr.status).toEqual(200);
        expect(tr.data).toEqual(initialData);
      }
    });
  });

  describe("if no themes are configured", () => {
    beforeAll(async () => {
      const res = await axios.put("/config/themes", []);
      expect(res.status).toEqual(204);
    });

    it("should report an error when retrieving all entries", async () => {
      const res = await axios.get("/list?query=all");
      expect(res.data).toEqual("No themes are configured.");
      expect(res.status).toEqual(400);
    });

    it("should not report an error when retrieving all locales", async () => {
      const res = await axios.get("/list?query=locale");
      expect(res.status).toEqual(200);
    });

    it("should not report an error for default query", async () => {
      const res = await axios.get("/list");
      expect(res.status).toEqual(200);
    });
  });

  describe("if no locales are configured", () => {
    beforeAll(async () => {
      const res = await axios.put("/config/locales", []);
      expect(res.status).toEqual(204);
    });

    it("should report an error when retrieving all entries", async () => {
      const res = await axios.get("/list?query=all");
      expect(res.data).toEqual("No themes are configured.");
      expect(res.status).toEqual(400);
    });

    it("should not report an error when retrieving all locales", async () => {
      const res = await axios.get("/list?query=locale");
      expect(res.data).toEqual("No locales are configured.");
      expect(res.status).toEqual(400);
    });

    it("should not report an error for default query", async () => {
      const res = await axios.get("/list");
      expect(res.data).toEqual("No locales are configured.");
      expect(res.status).toEqual(400);
    });
  });
});
