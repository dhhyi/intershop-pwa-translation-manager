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

  let listResponse;

  it("should return the locale links in the list response", async () => {
    listResponse = await axios.get("/list");
    expect(listResponse.status).toEqual(200);
    expect(listResponse.data).toMatchInlineSnapshot(`
      Array [
        Object {
          "lang": "de_AT",
          "url": "http://localhost:8001/localizations/de_AT?unblocked=true",
        },
        Object {
          "lang": "de_DE",
          "url": "http://localhost:8001/localizations/de_DE?unblocked=true",
        },
        Object {
          "lang": "en_US",
          "url": "http://localhost:8001/localizations/en_US?unblocked=true",
        },
        Object {
          "lang": "es_ES",
          "url": "http://localhost:8001/localizations/es_ES?unblocked=true",
        },
        Object {
          "lang": "fr_BE",
          "url": "http://localhost:8001/localizations/fr_BE?unblocked=true",
        },
        Object {
          "lang": "fr_FR",
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
