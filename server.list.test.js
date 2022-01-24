const axios = require("axios");

axios.defaults.baseURL = "http://localhost:" + (process.env.PORT || "8001");

axios.interceptors.response.use(
  (response) => response,
  (error) => Promise.resolve(error.response)
);

describe("Server List", () => {
  const locales = ["en", "fr", "de", "es"];
  const baseLang = "en";

  const initialData = {
    foo: "test",
    bar: "test",
  };

  beforeAll(async () => {
    await axios.put(
      "/config/languages",
      locales.filter((l) => l !== baseLang)
    );
    await axios.put("/config/baseLang", baseLang, {
      headers: { "content-type": "text/plain" },
    });

    for (const locale of locales) {
      const res = await axios.post("/import", initialData, {
        params: {
          locale,
          type: "replace",
        },
      });

      expect(res.data).toEqual("Imported 2 keys.");
      expect(res.status).toEqual(200);
    }
  });

  afterAll(async () => {
    for (const locale of locales) {
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
          "lang": "fr",
          "url": "http://localhost:8001/localizations/fr?exact=true",
        },
        Object {
          "lang": "de",
          "url": "http://localhost:8001/localizations/de?exact=true",
        },
        Object {
          "lang": "es",
          "url": "http://localhost:8001/localizations/es?exact=true",
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
