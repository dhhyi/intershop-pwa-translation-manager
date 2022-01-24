const axios = require("axios");

axios.defaults.baseURL = "http://localhost:" + (process.env.PORT || "8001");

describe("Server Import", () => {
  describe("expected errors", () => {
    it("should respond with 400 if locale query param is missing", async () => {
      const res = await axios
        .post("/import?type=replace", { foo: "test" })
        .catch((err) => err.response);
      expect(res.status).toEqual(400);
      expect(res.data).toMatchInlineSnapshot(
        `"Query parameter 'locale' is required."`
      );
    });

    it("should respond with 400 if type query param is missing", async () => {
      const res = await axios
        .post("/import?locale=de", { foo: "test" })
        .catch((err) => err.response);
      expect(res.status).toEqual(400);
      expect(res.data).toMatchInlineSnapshot(
        `"Query parameter 'type' is required. Options: replace, overwrite, add, delete"`
      );
    });

    it("should respond with 400 if there aren't any keys in the payload", async () => {
      const res = await axios
        .post("/import?locale=de&type=add", {})
        .catch((err) => err.response);
      expect(res.status).toEqual(400);
      expect(res.data).toMatchInlineSnapshot(
        `"Could not parse any data in the CSV or JSON content"`
      );
    });

    it("should respond with 400 if type is 'delete' and it has a payload", async () => {
      const res = await axios
        .post("/import?locale=de&type=delete", { foo: "bar" })
        .catch((err) => err.response);
      expect(res.status).toEqual(400);
      expect(res.data).toMatchInlineSnapshot(
        `"Did not expect a request body."`
      );
    });
  });

  describe("when importing a language with replace", () => {
    it("should respond with 204", async () => {
      const res = await axios.post("/import?locale=de&type=replace", {
        foo: "test",
        bar: "test",
      });
      expect(res.status).toEqual(204);
      expect(res.data).toBeEmpty();
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
    it("should respond with 204", async () => {
      const res = await axios.post("/import?locale=de&type=overwrite", {
        bar: "test2",
        foobar: "test2",
      });
      expect(res.status).toEqual(204);
      expect(res.data).toBeEmpty();
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
    it("should respond with 204", async () => {
      const res = await axios.post("/import?locale=de&type=add", {
        bar: "test3",
        foobar: "test3",
        test: "test3",
      });
      expect(res.status).toEqual(204);
      expect(res.data).toBeEmpty();
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
    it("should respond with 204", async () => {
      const res = await axios
        .post(
          "/import?locale=de&type=replace",
          JSON.stringify({
            foo: "json",
            bar: "json",
          }),
          { headers: { "content-type": "text/plain" } }
        )
        .catch((err) => err.response);
      expect(res.status).toEqual(204);
      expect(res.data).toBeEmpty();
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
    it("should respond with 204", async () => {
      const res = await axios
        .post(
          "/import?locale=de&type=replace",
          `foo;;csv
bar;;csv
`,
          { headers: { "content-type": "text/plain" } }
        )
        .catch((err) => err.response);
      expect(res.status).toEqual(204);
      expect(res.data).toBeEmpty();
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

  describe("when importing a language with delete", () => {
    it("should respond with 204", async () => {
      const res = await axios
        .post("/import?locale=de&type=delete", undefined, {
          headers: { "content-type": "application/json" },
        })
        .catch((err) => err.response);
      expect(res.data).toBeEmpty();
      expect(res.status).toEqual(204);
    });

    it("should have the new translations available", async () => {
      const res = await axios.get("/localizations/de");
      expect(res.status).toEqual(200);
      expect(res.data).toBeEmpty();
    });
  });
});
