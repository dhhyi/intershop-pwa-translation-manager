const axios = require("axios");

axios.defaults.baseURL = "http://localhost:" + (process.env.PORT || "8001");

axios.interceptors.response.use(
  (response) => response,
  (error) => Promise.resolve(error.response)
);

describe("Server Localizations", () => {
  const initialData = {
    foo: "test",
    bar: "test",
  };

  beforeAll(async () => {
    const config = await axios.put("/config/locales", ["fr_FR"]);
    expect(config.status).toEqual(204);

    const lang = await axios.post("/import", initialData, {
      params: {
        locale: "fr",
        type: "replace",
      },
    });

    expect(lang.data).toEqual("Imported 2 keys.");
    expect(lang.status).toEqual(200);

    const locale = await axios.delete("/import", {
      params: {
        locale: "fr_FR",
      },
    });

    expect(locale.data).toEqual("Deleted all keys.");
    expect(locale.status).toEqual(200);
  });

  afterAll(async () => {
    const res = await axios.delete("/import?locale=fr");

    expect(res.data).toEqual("Deleted all keys.");
    expect(res.status).toEqual(200);
  });

  it.each([
    "fr",
    "fr_FR",
    "fr-FR",
    "fr-fr",
    "FR-FR",
    "fr.json",
    "fr_FR.json",
    "fr-FR.json",
  ])("should have the imported translations for request '%s'", async (req) => {
    const res = await axios.get("/localizations/" + req);
    expect(res.status).toEqual(200);
    expect(res.data).toEqual(initialData);
    expect(res.headers["content-type"]).toStartWith("application/json");
  });

  it("should return the data for detail requests", async () => {
    const res = await axios.get("/localizations/fr/foo");
    expect(res.status).toEqual(200);
    expect(res.data).toEqual("test");
    expect(res.headers["content-type"]).toStartWith("text/plain");
  });

  it("should return not found for detail requests without data", async () => {
    const res = await axios.get("/localizations/fr/foobar");
    expect(res.status).toEqual(404);
  });

  describe("when changing a key", () => {
    it("should return 204", async () => {
      const res = await axios.put("/localizations/fr/foo", "changed", {
        headers: { "content-type": "text/plain" },
      });
      expect(res.data).toBeEmpty();
      expect(res.status).toEqual(204);
    });

    it("should have the new value in the detail response", async () => {
      const res = await axios.get("/localizations/fr/foo");
      expect(res.status).toEqual(200);
      expect(res.data).toEqual("changed");
    });

    it("should have the new value in the localizations response", async () => {
      const res = await axios.get("/localizations/fr");
      expect(res.status).toEqual(200);
      expect(res.data.foo).toEqual("changed");
    });
  });

  describe("when adding a key", () => {
    it("should return 204", async () => {
      const res = await axios.put("/localizations/fr/foobar", "added", {
        headers: { "content-type": "text/plain" },
      });
      expect(res.data).toBeEmpty();
      expect(res.status).toEqual(204);
    });

    it("should have the new value in the detail response", async () => {
      const res = await axios.get("/localizations/fr/foobar");
      expect(res.status).toEqual(200);
      expect(res.data).toEqual("added");
    });

    it("should have the new value in the localizations response", async () => {
      const res = await axios.get("/localizations/fr");
      expect(res.status).toEqual(200);
      expect(res.data.foobar).toEqual("added");
    });
  });

  describe("when deleting a key", () => {
    it("should return 204", async () => {
      const res = await axios.delete("/localizations/fr/bar");
      expect(res.data).toBeEmpty();
      expect(res.status).toEqual(204);
    });

    it("should not have the key anymore", async () => {
      const res = await axios.get("/localizations/fr/bar");
      expect(res.status).toEqual(404);
    });

    it("should not have the value in the localizations response", async () => {
      const res = await axios.get("/localizations/fr");
      expect(res.status).toEqual(200);
      expect(res.data.bar).toBeUndefined();
    });
  });

  describe("when overriding a key in a locale", () => {
    it("should return 204", async () => {
      const res = await axios.put("/localizations/fr_FR/foo", "override", {
        headers: { "content-type": "text/plain" },
      });
      expect(res.data).toBeEmpty();
      expect(res.status).toEqual(204);
    });

    it("should have the override value in the locale detail response", async () => {
      const res = await axios.get("/localizations/fr_FR/foo");
      expect(res.status).toEqual(200);
      expect(res.data).toEqual("override");
    });

    it("should have the override value in the locale response", async () => {
      const res = await axios.get("/localizations/fr_FR");
      expect(res.status).toEqual(200);
      expect(res.data.foo).toEqual("override");
    });

    it("should have the original value in the language detail response", async () => {
      const res = await axios.get("/localizations/fr/foo");
      expect(res.status).toEqual(200);
      expect(res.data).toEqual("changed");
    });

    it("should have the original value in the language response", async () => {
      const res = await axios.get("/localizations/fr");
      expect(res.status).toEqual(200);
      expect(res.data.foo).toEqual("changed");
    });
  });
});
