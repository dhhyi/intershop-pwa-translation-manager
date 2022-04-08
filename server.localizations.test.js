describe("Server Localizations", () => {
  const initialData = {
    foo: "test",
    bar: "test",
    dummy: "test",
  };

  beforeAll(async () => {
    const deleteDB = await axios.delete("/db", {});
    expect(deleteDB.status).toEqual(204);

    const config = await axios.put("/config/locales", ["fr_FR"]);
    expect(config.status).toEqual(204);

    const themes = await axios.put("/config/themes", ["b2c"]);
    expect(themes.status).toEqual(204);

    const lang = await axios.post("/import/fr?type=replace", initialData);

    expect(lang.data).toEqual("Imported 3 keys.");
    expect(lang.status).toEqual(200);
  });

  it.each([
    "fr",
    "fr/b2c",
    "fr_FR",
    "fr_FR/b2c",
    "fr_FR-b2c",
    "fr-FR",
    "fr-fr",
    "FR-FR",
    "fr.json",
    "fr/b2c.json",
    "fr_FR.json",
    "fr-FR.json",
    "fr_FR-b2c.json",
  ])("should have the imported translations for request '%s'", async (req) => {
    const res = await axios.get("/localizations/" + req);
    expect(res.data).toEqual(initialData);
    expect(res.status).toEqual(200);
    expect(res.headers["content-type"]).toStartWith("application/json");
  });

  it.each([
    "de",
    "de/b2c",
    "de_DE",
    "de_DE/b2c",
    "de-DE-b2c",
    "de_DE-b2c.json",
  ])(
    "should return empty object for unknown data request '%s'",
    async (req) => {
      const res = await axios.get("/localizations/" + req);
      expect(res.status).toEqual(200);
      expect(res.data).toEqual({});
      expect(res.headers["content-type"]).toStartWith("application/json");
    }
  );

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
      const res = await axios.put(
        "/localizations/fr_FR/foo",
        "locale-override",
        {
          headers: { "content-type": "text/plain" },
        }
      );
      expect(res.data).toBeEmpty();
      expect(res.status).toEqual(204);
    });

    it("should have the override value in the locale detail response", async () => {
      const res = await axios.get("/localizations/fr_FR/foo");
      expect(res.status).toEqual(200);
      expect(res.data).toEqual("locale-override");
    });

    it("should have the override value in the locale response", async () => {
      const res = await axios.get("/localizations/fr_FR");
      expect(res.status).toEqual(200);
      expect(res.data.foo).toEqual("locale-override");
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

  describe("when overriding a key in a language theme", () => {
    it("should return 204", async () => {
      const res = await axios.put(
        "/localizations/fr/b2c/dummy",
        "theme-override",
        {
          headers: { "content-type": "text/plain" },
        }
      );
      expect(res.data).toBeEmpty();
      expect(res.status).toEqual(204);
    });

    it("should have the override value in the theme detail response", async () => {
      const res = await axios.get("/localizations/fr/b2c/dummy");
      expect(res.status).toEqual(200);
      expect(res.data).toEqual("theme-override");
    });

    it("should have the override value in the theme response", async () => {
      const res = await axios.get("/localizations/fr/b2c");
      expect(res.status).toEqual(200);
      expect(res.data.dummy).toEqual("theme-override");
    });

    it("should have the original value in the language detail response", async () => {
      const res = await axios.get("/localizations/fr/dummy");
      expect(res.status).toEqual(200);
      expect(res.data).toEqual("test");
    });

    it("should have the original value in the language response", async () => {
      const res = await axios.get("/localizations/fr");
      expect(res.status).toEqual(200);
      expect(res.data.dummy).toEqual("test");
    });
  });

  describe("when overriding a key in locale and theme", () => {
    it("should return 204", async () => {
      const res1 = await axios.put(
        "/localizations/fr-fr-b2c/dummy",
        "theme-locale-override",
        {
          headers: { "content-type": "text/plain" },
        }
      );
      expect(res1.data).toBeEmpty();
      expect(res1.status).toEqual(204);

      const res2 = await axios.put(
        "/localizations/fr-fr/dummy",
        "locale-override",
        {
          headers: { "content-type": "text/plain" },
        }
      );
      expect(res2.data).toBeEmpty();
      expect(res2.status).toEqual(204);

      const res3 = await axios.put(
        "/localizations/fr/b2c/dummy",
        "theme-override",
        {
          headers: { "content-type": "text/plain" },
        }
      );
      expect(res3.data).toBeEmpty();
      expect(res3.status).toEqual(204);
    });

    it.each`
      query          | value
      ${"fr"}        | ${"test"}
      ${"fr-fr"}     | ${"locale-override"}
      ${"fr-FR"}     | ${"locale-override"}
      ${"fr_FR"}     | ${"locale-override"}
      ${"fr-fr-b2c"} | ${"theme-locale-override"}
      ${"fr_FR-b2c"} | ${"theme-locale-override"}
      ${"fr_FR/b2c"} | ${"theme-locale-override"}
      ${"fr/b2c"}    | ${"theme-override"}
      ${"FR/b2c"}    | ${"theme-override"}
    `("should have value $value for query $query", async ({ query, value }) => {
      const res = await axios.get(`/localizations/${query}/dummy`);
      expect(res.status).toEqual(200);
      expect(res.data).toEqual(value);
    });
  });
});
