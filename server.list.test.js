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
    const deleteDB = await axios.delete("/db", {});
    expect(deleteDB.status).toEqual(204);

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

    const combinationsRes = await axios.put("/config/combinations", {
      en: {
        en_US: ["b2c", "b2b"],
      },
      de: {
        de_DE: ["b2c", "b2b"],
        de_AT: ["b2c"],
      },
      fr: {
        fr_FR: ["b2c", "b2b"],
        fr_BE: ["b2c"],
      },
      es: {
        es_ES: ["b2c"],
      },
    });
    expect(combinationsRes.status).toEqual(204);

    for (const lang of ["en", "de", "fr", "es"]) {
      const res = await axios.post("/import/" + lang, initialData, {
        params: {
          type: "replace",
        },
      });

      expect(res.data).toEqual("Imported 2 keys.");
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
            "id": "de_AT-b2b",
            "locale": "de_AT",
            "theme": "b2b",
            "url": "http://localhost:8001/localizations/de_AT-b2b?unblocked=true",
          },
          Object {
            "id": "de_AT-b2c",
            "locale": "de_AT",
            "theme": "b2c",
            "url": "http://localhost:8001/localizations/de_AT-b2c?unblocked=true",
          },
          Object {
            "id": "de_DE-b2b",
            "locale": "de_DE",
            "theme": "b2b",
            "url": "http://localhost:8001/localizations/de_DE-b2b?unblocked=true",
          },
          Object {
            "id": "de_DE-b2c",
            "locale": "de_DE",
            "theme": "b2c",
            "url": "http://localhost:8001/localizations/de_DE-b2c?unblocked=true",
          },
          Object {
            "id": "en_US-b2b",
            "locale": "en_US",
            "theme": "b2b",
            "url": "http://localhost:8001/localizations/en_US-b2b?unblocked=true",
          },
          Object {
            "id": "en_US-b2c",
            "locale": "en_US",
            "theme": "b2c",
            "url": "http://localhost:8001/localizations/en_US-b2c?unblocked=true",
          },
          Object {
            "id": "es_ES-b2b",
            "locale": "es_ES",
            "theme": "b2b",
            "url": "http://localhost:8001/localizations/es_ES-b2b?unblocked=true",
          },
          Object {
            "id": "es_ES-b2c",
            "locale": "es_ES",
            "theme": "b2c",
            "url": "http://localhost:8001/localizations/es_ES-b2c?unblocked=true",
          },
          Object {
            "id": "fr_BE-b2b",
            "locale": "fr_BE",
            "theme": "b2b",
            "url": "http://localhost:8001/localizations/fr_BE-b2b?unblocked=true",
          },
          Object {
            "id": "fr_BE-b2c",
            "locale": "fr_BE",
            "theme": "b2c",
            "url": "http://localhost:8001/localizations/fr_BE-b2c?unblocked=true",
          },
          Object {
            "id": "fr_FR-b2b",
            "locale": "fr_FR",
            "theme": "b2b",
            "url": "http://localhost:8001/localizations/fr_FR-b2b?unblocked=true",
          },
          Object {
            "id": "fr_FR-b2c",
            "locale": "fr_FR",
            "theme": "b2c",
            "url": "http://localhost:8001/localizations/fr_FR-b2c?unblocked=true",
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

  describe("combinations query", () => {
    let listResponse;

    it("should return all locale X theme links respecting supplied combinations in the list response", async () => {
      listResponse = await axios.get("/list?query=combinations");
      expect(listResponse.status).toEqual(200);
      expect(listResponse.data).toMatchInlineSnapshot(`
        Array [
          Object {
            "id": "de_AT-b2c",
            "locale": "de_AT",
            "theme": "b2c",
            "url": "http://localhost:8001/localizations/de_AT-b2c?unblocked=true",
          },
          Object {
            "id": "de_DE-b2b",
            "locale": "de_DE",
            "theme": "b2b",
            "url": "http://localhost:8001/localizations/de_DE-b2b?unblocked=true",
          },
          Object {
            "id": "de_DE-b2c",
            "locale": "de_DE",
            "theme": "b2c",
            "url": "http://localhost:8001/localizations/de_DE-b2c?unblocked=true",
          },
          Object {
            "id": "en_US-b2b",
            "locale": "en_US",
            "theme": "b2b",
            "url": "http://localhost:8001/localizations/en_US-b2b?unblocked=true",
          },
          Object {
            "id": "en_US-b2c",
            "locale": "en_US",
            "theme": "b2c",
            "url": "http://localhost:8001/localizations/en_US-b2c?unblocked=true",
          },
          Object {
            "id": "es_ES-b2c",
            "locale": "es_ES",
            "theme": "b2c",
            "url": "http://localhost:8001/localizations/es_ES-b2c?unblocked=true",
          },
          Object {
            "id": "fr_BE-b2c",
            "locale": "fr_BE",
            "theme": "b2c",
            "url": "http://localhost:8001/localizations/fr_BE-b2c?unblocked=true",
          },
          Object {
            "id": "fr_FR-b2b",
            "locale": "fr_FR",
            "theme": "b2b",
            "url": "http://localhost:8001/localizations/fr_FR-b2b?unblocked=true",
          },
          Object {
            "id": "fr_FR-b2c",
            "locale": "fr_FR",
            "theme": "b2c",
            "url": "http://localhost:8001/localizations/fr_FR-b2c?unblocked=true",
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

  describe("parameter handling", () => {
    it("should include request parameters in follow up links", async () => {
      const listResponse = await axios.get("/list?exact=true&foo=bar");
      expect(listResponse.status).toEqual(200);

      listResponse.data.forEach((link) => {
        expect(link.url).toInclude("unblocked=true");
        expect(link.url).toInclude("exact=true");
        expect(link.url).toInclude("foo=bar");
      });
    });
  });

  describe("if no combinations are configured", () => {
    beforeAll(async () => {
      const res = await axios.put("/config/combinations", {});
      expect(res.status).toEqual(204);
    });

    it("should report an error when retrieving combination entries", async () => {
      const res = await axios.get("/list?query=combinations");
      expect(res.data).toEqual("No combinations are configured.");
      expect(res.status).toEqual(400);
    });

    it("should not report an error when retrieving all entries", async () => {
      const res = await axios.get("/list?query=all");
      expect(res.status).toEqual(200);
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
