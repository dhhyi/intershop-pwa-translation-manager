import axios from "axios";

describe("Server Import", () => {
  beforeAll(async () => {
    const deleteDB = await axios.delete("/db", {});
    expect(deleteDB.status).toEqual(204);

    const config = await axios.put("/config/locales", ["de_DE"]);
    expect(config.status).toEqual(204);
  });

  describe("expected errors", () => {
    it("should respond with 400 if type query param is missing", async () => {
      const res = await axios.post("/import/de", { foo: "test" });
      expect(res.status).toEqual(400);
      expect(res.data).toMatchInlineSnapshot(
        `"Query parameter 'type' is required. Options: replace, overwrite, add"`
      );
    });

    it("should respond with 400 if there aren't any keys in the payload", async () => {
      const res = await axios.post("/import/de?type=add", {});
      expect(res.status).toEqual(400);
      expect(res.data).toMatchInlineSnapshot(
        `"Could not parse any data in the CSV or JSON content"`
      );
    });
  });

  describe("when importing a language with replace", () => {
    it("should respond with 200", async () => {
      const res = await axios.post("/import/de?type=replace", {
        foo: "test",
        bar: "test",
      });
      expect(res.status).toEqual(200);
      expect(res.data).toMatchInlineSnapshot(`"Imported 2 keys."`);
    });

    it("should have the new translations available", async () => {
      const res = await axios.get("/localizations/de");
      expect(res.status).toEqual(200);
      expect(res.data).toMatchInlineSnapshot(`
        Object {
          "bar": "test",
          "foo": "test",
        }
      `);
    });
  });

  describe("when importing a language with overwrite", () => {
    it("should respond with 200", async () => {
      const res = await axios.post("/import/de?type=overwrite", {
        bar: "test2",
        foobar: "test2",
      });
      expect(res.status).toEqual(200);
      expect(res.data).toMatchInlineSnapshot(`"Imported 2 keys."`);
    });

    it("should have the new translations available", async () => {
      const res = await axios.get("/localizations/de");
      expect(res.status).toEqual(200);
      expect(res.data).toMatchInlineSnapshot(`
        Object {
          "bar": "test2",
          "foo": "test",
          "foobar": "test2",
        }
      `);
    });
  });

  describe("when importing a language with add", () => {
    it("should respond with 200", async () => {
      const res = await axios.post("/import/de?type=add", {
        bar: "test3",
        foobar: "test3",
        test: "test3",
      });
      expect(res.status).toEqual(200);
      expect(res.data).toMatchInlineSnapshot(`"Imported 1 keys."`);
    });

    it("should have the new translations available", async () => {
      const res = await axios.get("/localizations/de");
      expect(res.status).toEqual(200);
      expect(res.data).toMatchInlineSnapshot(`
        Object {
          "bar": "test2",
          "foo": "test",
          "foobar": "test2",
          "test": "test3",
        }
      `);
    });
  });

  describe("when using textual JSON for the import", () => {
    it("should respond with 200", async () => {
      const res = await axios.post(
        "/import/de?type=replace",
        JSON.stringify({
          foo: "json",
          bar: "json",
        }),
        { headers: { "content-type": "text/plain" } }
      );
      expect(res.status).toEqual(200);
      expect(res.data).toMatchInlineSnapshot(`"Imported 2 keys."`);
    });

    it("should have the new translations available", async () => {
      const res = await axios.get("/localizations/de");
      expect(res.status).toEqual(200);
      expect(res.data).toMatchInlineSnapshot(`
        Object {
          "bar": "json",
          "foo": "json",
        }
      `);
    });
  });

  describe("when using textual CSV for the import", () => {
    it("should respond with 200", async () => {
      const res = await axios.post(
        "/import/de?type=replace",
        `foo,,csv
bar,,csv
`,
        { headers: { "content-type": "text/plain" } }
      );
      expect(res.status).toEqual(200);
      expect(res.data).toMatchInlineSnapshot(`"Imported 2 keys."`);
    });

    it("should have the new translations available", async () => {
      const res = await axios.get("/localizations/de");
      expect(res.status).toEqual(200);
      expect(res.data).toMatchInlineSnapshot(`
        Object {
          "bar": "csv",
          "foo": "csv",
        }
      `);
    });
  });

  describe("when using textual CSV with escapes for the import", () => {
    it("should respond with 200", async () => {
      const res = await axios.post(
        "/import/de?type=replace",
        `foo,,"""c""sv2"
bar,,"&quot;csv2&quot;"
`,
        { headers: { "content-type": "text/plain" } }
      );
      expect(res.status).toEqual(200);
      expect(res.data).toMatchInlineSnapshot(`"Imported 2 keys."`);
    });

    it("should have the new translations available", async () => {
      const res = await axios.get("/localizations/de");
      expect(res.status).toEqual(200);
      expect(res.data).toMatchInlineSnapshot(`
        Object {
          "bar": "&quot;csv2&quot;",
          "foo": "\\"c\\"sv2",
        }
      `);
    });
  });

  describe("when using textual CSV with semicolons for the import", () => {
    it("should respond with 200", async () => {
      const res = await axios.post(
        "/import/de?type=replace",
        `foo;;csv3
bar;;csv3
`,
        { headers: { "content-type": "text/plain" } }
      );
      expect(res.status).toEqual(200);
      expect(res.data).toMatchInlineSnapshot(`"Imported 2 keys."`);
    });

    it("should have the new translations available", async () => {
      const res = await axios.get("/localizations/de");
      expect(res.status).toEqual(200);
      expect(res.data).toMatchInlineSnapshot(`
        Object {
          "bar": "csv3",
          "foo": "csv3",
        }
      `);
    });
  });

  describe("when using textual CSV with semicolons and escapes for the import", () => {
    it("should respond with 200", async () => {
      const res = await axios.post(
        "/import/de?type=replace",
        `foo;;"""c""sv4"
bar;;"&quot;csv4&quot;"
`,
        { headers: { "content-type": "text/plain" } }
      );
      expect(res.status).toEqual(200);
      expect(res.data).toMatchInlineSnapshot(`"Imported 2 keys."`);
    });

    it("should have the new translations available", async () => {
      const res = await axios.get("/localizations/de");
      expect(res.status).toEqual(200);
      expect(res.data).toMatchInlineSnapshot(`
        Object {
          "bar": "&quot;csv4&quot;",
          "foo": "\\"c\\"sv4",
        }
      `);
    });
  });

  describe("when using textual CSV with empty keys for the import", () => {
    it("should respond with 200", async () => {
      const res = await axios.post(
        "/import/de?type=replace",
        `foo,,csv
bar,,csv
foobar,,
`,
        { headers: { "content-type": "text/plain" } }
      );
      expect(res.status).toEqual(200);
      expect(res.data).toMatchInlineSnapshot(`"Imported 2 keys."`);
    });

    it("should have the new translations with value available", async () => {
      const res = await axios.get("/localizations/de");
      expect(res.status).toEqual(200);
      expect(res.data).toMatchInlineSnapshot(`
        Object {
          "bar": "csv",
          "foo": "csv",
        }
      `);
    });
  });

  describe("when deleting a language", () => {
    it("should respond with 200", async () => {
      const res = await axios.delete("/import/de");
      expect(res.data).toEqual("Deleted all keys.");
      expect(res.status).toEqual(200);
    });

    it("should have no translations available", async () => {
      const res = await axios.get("/localizations/de");
      expect(res.status).toEqual(200);
      expect(res.data).toBeEmpty();
    });
  });
});
