const axios = require("axios");
const _ = require("lodash");

axios.defaults.baseURL = "http://localhost:" + (process.env.PORT || "8001");

axios.interceptors.response.use(
  (response) => response,
  (error) => Promise.resolve(error.response)
);

describe("Server Config", () => {
  beforeAll(async () => {
    const deleteDB = await axios.delete("/db", {});
    expect(deleteDB.status).toEqual(204);
  });

  it("should start up", async () => {
    const res = await axios.get("/config");
    expect(res.status).toEqual(200);
    expect(res.data).toMatchInlineSnapshot(`
      Object {
        "baseLang": "en",
        "block": false,
        "languages": Array [],
        "translateAvailable": false,
      }
    `);
  });

  describe("when pushing a whole config", () => {
    it("should respond with 204", async () => {
      const res = await axios.post("/config", {
        foo: "test",
        bar: "foobar",
      });
      expect(res.status).toEqual(204);
      expect(res.data).toBeEmpty();
    });

    it("should have the new data set in config response", async () => {
      const res = await axios.get("/config");
      expect(res.status).toEqual(200);
      expect(_.pick(res.data, "foo", "bar")).toMatchInlineSnapshot(`
        Object {
          "bar": "foobar",
          "foo": "test",
        }
      `);
    });

    it("should have the new data set in config detail response", async () => {
      const res = await axios.get("/config/foo");
      expect(res.status).toEqual(200);
      expect(res.data).toEqual("test");
    });
  });

  describe("when setting a string config field", () => {
    it("should respond with 204", async () => {
      const res = await axios.put("/config/dummy", "test", {
        headers: { "Content-Type": "text/plain" },
      });
      expect(res.status).toEqual(204);
      expect(res.data).toBeEmpty();
    });

    it("should have the new data set in config detail response", async () => {
      const res = await axios.get("/config/dummy");
      expect(res.status).toEqual(200);
      expect(res.data).toEqual("test");
    });

    it("should have the new data set in config response", async () => {
      const res = await axios.get("/config");
      expect(res.status).toEqual(200);
      expect(res.data.dummy).toEqual("test");
    });

    describe("when deleting the field", () => {
      it("should respond with 204", async () => {
        const res = await axios.delete("/config/dummy");
        expect(res.status).toEqual(204);
        expect(res.data).toBeEmpty();
      });

      it("should not have the data set in config detail response", async () => {
        const res = await axios.get("/config/dummy");
        expect(res.status).toEqual(404);
      });

      it("should not have the data set in config response", async () => {
        const res = await axios.get("/config");
        expect(res.status).toEqual(200);
        expect(res.data.dummy).toBeUndefined();
      });
    });
  });

  describe("when setting a boolean config field", () => {
    it("should respond with 204", async () => {
      const res = await axios.put("/config/dummy", "true", {
        headers: { "Content-Type": "text/plain" },
      });
      expect(res.status).toEqual(204);
      expect(res.data).toBeEmpty();
    });

    it("should have the new data set in config detail response", async () => {
      const res = await axios.get("/config/dummy");
      expect(res.status).toEqual(200);
      expect(res.data).toBeTrue();
    });

    it("should have the new data set in config response", async () => {
      const res = await axios.get("/config");
      expect(res.status).toEqual(200);
      expect(res.data.dummy).toBeTrue();
    });

    describe("when deleting the field", () => {
      it("should respond with 204", async () => {
        const res = await axios.delete("/config/dummy");
        expect(res.status).toEqual(204);
        expect(res.data).toBeEmpty();
      });

      it("should not have the data set in config detail response", async () => {
        const res = await axios.get("/config/dummy");
        expect(res.status).toEqual(404);
      });

      it("should not have the data set in config response", async () => {
        const res = await axios.get("/config");
        expect(res.status).toEqual(200);
        expect(res.data.dummy).toBeUndefined();
      });
    });
  });

  describe("when setting an object config field", () => {
    it("should respond with 204", async () => {
      const res = await axios.put("/config/dummy", ["foo", "bar"]);
      expect(res.status).toEqual(204);
      expect(res.data).toBeEmpty();
    });

    it("should have the new data set in config detail response", async () => {
      const res = await axios.get("/config/dummy");
      expect(res.status).toEqual(200);
      expect(res.data).toMatchInlineSnapshot(`
        Array [
          "foo",
          "bar",
        ]
      `);
    });

    it("should have the new data set in config response", async () => {
      const res = await axios.get("/config");
      expect(res.status).toEqual(200);
      expect(res.data.dummy).toMatchInlineSnapshot(`
        Array [
          "foo",
          "bar",
        ]
      `);
    });

    describe("when deleting the field", () => {
      it("should respond with 204", async () => {
        const res = await axios.delete("/config/dummy");
        expect(res.status).toEqual(204);
        expect(res.data).toBeEmpty();
      });

      it("should not have the data set in config detail response", async () => {
        const res = await axios.get("/config/dummy");
        expect(res.status).toEqual(404);
      });

      it("should not have the data set in config response", async () => {
        const res = await axios.get("/config");
        expect(res.status).toEqual(200);
        expect(res.data.dummy).toBeUndefined();
      });
    });
  });

  describe("when setting the block config field", () => {
    it("should respond with 204", async () => {
      const res = await axios.put("/config/block");
      expect(res.status).toEqual(204);
      expect(res.data).toBeEmpty();
    });

    it("should have the new data set in config detail response", async () => {
      const res = await axios.get("/config/block");
      expect(res.status).toEqual(200);
      expect(res.data).toBeTrue();
    });

    it("should have the new data set in config response", async () => {
      const res = await axios.get("/config");
      expect(res.status).toEqual(200);
      expect(res.data.block).toBeTrue();
    });

    describe("when deleting the field", () => {
      it("should respond with 204", async () => {
        const res = await axios.delete("/config/block");
        expect(res.status).toEqual(204);
        expect(res.data).toBeEmpty();
      });

      it("should be false in the config detail response", async () => {
        const res = await axios.get("/config/block");
        expect(res.status).toEqual(200);
        expect(res.data).toBeFalse();
      });

      it("should not have the data set in config response", async () => {
        const res = await axios.get("/config");
        expect(res.status).toEqual(200);
        expect(res.data.block).toBeFalse();
      });
    });
  });

  describe("when setting a readonly config field", () => {
    it("should respond with 405", async () => {
      const res = await axios.put("/config/translateAvailable");
      expect(res.status).toEqual(405);
    });
  });

  describe("when deleting a readonly config field", () => {
    it("should respond with 405", async () => {
      const res = await axios.delete("/config/translateAvailable");
      expect(res.status).toEqual(405);
    });
  });

  describe("when retrieving the languages dynamic field", () => {
    describe("before setting locales", () => {
      it("should return an empty array", async () => {
        const res = await axios.get("/config/languages");
        expect(res.status).toEqual(200);
        expect(res.data).toEqual([]);
      });
    });

    describe("after setting locales", () => {
      beforeAll(async () => {
        const localesRes = await axios.put("/config/locales", [
          "en_US",
          "de_DE",
          "de_AT",
          "nl_BE",
          "fr_FR",
        ]);
        expect(localesRes.data).toBeEmpty();
        expect(localesRes.status).toEqual(204);
      });

      it("should return an array with languages", async () => {
        const res = await axios.get("/config/languages");
        expect(res.status).toEqual(200);
        expect(res.data).toEqual(["de", "en", "fr", "nl"]);
      });
    });
  });

  describe("config validation", () => {
    describe("locales", () => {
      it("should set the locales to an array when importing as string", async () => {
        const localesRes = await axios.put("/config/locales", "en_US,de_DE", {
          headers: { "Content-Type": "text/plain" },
        });
        expect(localesRes.data).toBeEmpty();
        expect(localesRes.status).toEqual(204);

        const res = await axios.get("/config/locales");
        expect(res.status).toEqual(200);
        expect(res.data).toEqual(["en_US", "de_DE"]);
      });

      it("should set the locales to an array when importing as array", async () => {
        const localesRes = await axios.put("/config/locales", [
          "en_US",
          "de_DE",
        ]);
        expect(localesRes.data).toBeEmpty();
        expect(localesRes.status).toEqual(204);

        const res = await axios.get("/config/locales");
        expect(res.status).toEqual(200);
        expect(res.data).toEqual(["en_US", "de_DE"]);
      });

      it("should fail when the locales cannot be parsed", async () => {
        const localesRes = await axios.put("/config/locales", "true");
        expect(localesRes.data).toEqual("Could not set locales.");
        expect(localesRes.status).toEqual(400);
      });

      it("should fail when the locales are not locales", async () => {
        const localesRes = await axios.put("/config/locales", "en,12345", {
          headers: { "Content-Type": "text/plain" },
        });
        expect(localesRes.data).toEqual(
          'Could not set locales. Cannot parse "en" as locale. Cannot parse "12345" as locale.'
        );
        expect(localesRes.status).toEqual(400);
      });

      it("should try to parse locales correctly", async () => {
        const localesRes = await axios.put("/config/locales", [
          "en-US",
          "de_de",
          "fr/fr",
        ]);
        expect(localesRes.data).toBeEmpty();
        expect(localesRes.status).toEqual(204);

        const res = await axios.get("/config/locales");
        expect(res.status).toEqual(200);
        expect(res.data).toEqual(["en_US", "de_DE", "fr_FR"]);
      });
    });

    describe("themes", () => {
      it("should set the themes to an array when importing as string", async () => {
        const themesRes = await axios.put("/config/themes", "b2c,b2b", {
          headers: { "Content-Type": "text/plain" },
        });
        expect(themesRes.data).toBeEmpty();
        expect(themesRes.status).toEqual(204);

        const res = await axios.get("/config/themes");
        expect(res.status).toEqual(200);
        expect(res.data).toEqual(["b2c", "b2b"]);
      });

      it("should set the themes to an array when importing as array", async () => {
        const themesRes = await axios.put("/config/themes", ["b2c", "b2b"]);
        expect(themesRes.data).toBeEmpty();
        expect(themesRes.status).toEqual(204);

        const res = await axios.get("/config/themes");
        expect(res.status).toEqual(200);
        expect(res.data).toEqual(["b2c", "b2b"]);
      });

      it("should fail when the themes cannot be parsed", async () => {
        const themesRes = await axios.put("/config/themes", "true");
        expect(themesRes.data).toEqual("Could not set themes.");
        expect(themesRes.status).toEqual(400);
      });
    });
  });
});
