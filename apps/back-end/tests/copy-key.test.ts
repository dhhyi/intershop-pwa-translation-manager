import axios from "axios";

describe("Server Copy-Key", () => {
  beforeAll(async () => {
    const deleteDB = await axios.delete("/db", {});
    expect(deleteDB.status).toEqual(204);

    const config = await axios.put("/config/locales", [
      "fr_FR",
      "de_DE",
      "fr_BE",
    ]);
    expect(config.status).toEqual(204);

    const themes = await axios.put("/config/themes", ["b2c", "b2b"]);
    expect(themes.status).toEqual(204);

    const langFr = await axios.post("/import/fr?type=replace", {
      foo: "test",
      bar: "test",
    });
    expect(langFr.data).toEqual("Imported 2 keys.");
    expect(langFr.status).toEqual(200);

    const langFrBE = await axios.post("/import/fr_BE?type=replace", {
      foo: "test_override",
    });
    expect(langFrBE.data).toEqual("Imported 1 keys.");
    expect(langFrBE.status).toEqual(200);

    const langFrBEb2b = await axios.post("/import/fr_BE/b2b?type=replace", {
      foo: "test_override_override",
    });
    expect(langFrBEb2b.data).toEqual("Imported 1 keys.");
    expect(langFrBEb2b.status).toEqual(200);

    const langDeDE = await axios.post("/import/de_DE?type=replace", {
      bar: "test_other",
    });
    expect(langDeDE.data).toEqual("Imported 1 keys.");
    expect(langDeDE.status).toEqual(200);
  });

  it("should be created", async () => {
    const langFr = await axios.get("/localizations/fr");
    expect(langFr.data).toMatchInlineSnapshot(`
      Object {
        "bar": "test",
        "foo": "test",
      }
    `);

    const langFrBE = await axios.get("/localizations/fr_BE");
    expect(langFrBE.data).toMatchInlineSnapshot(`
      Object {
        "bar": "test",
        "foo": "test_override",
      }
    `);

    const langFrBEb2b = await axios.get("/localizations/fr_BE/b2b");
    expect(langFrBEb2b.data).toMatchInlineSnapshot(`
      Object {
        "bar": "test",
        "foo": "test_override_override",
      }
    `);

    const langDe = await axios.get("/localizations/de");
    expect(langDe.data).toBeEmpty();

    const langDeDE = await axios.get("/localizations/de_DE");
    expect(langDeDE.data).toMatchInlineSnapshot(`
      Object {
        "bar": "test_other",
      }
    `);
  });

  it("should copy a key in all languages where it exists (1)", async () => {
    const res = await axios.post("/copy-key", { from: "foo", to: "foo_copy" });

    expect(res.status).toEqual(200);
    expect(res.data).toEqual("Copied key in fr, fr_BE, fr_BE-b2b.");

    expect(await axios.get("/localizations/fr/foo_copy")).toHaveProperty(
      "data",
      "test"
    );
    expect(await axios.get("/localizations/fr_BE/foo_copy")).toHaveProperty(
      "data",
      "test_override"
    );
    expect(await axios.get("/localizations/fr_BE/b2b/foo_copy")).toHaveProperty(
      "data",
      "test_override_override"
    );
    expect(await axios.get("/localizations/de/foo_copy")).toHaveProperty(
      "status",
      404
    );
    expect(await axios.get("/localizations/de_DE/foo_copy")).toHaveProperty(
      "status",
      404
    );
  });

  it("should copy a key in all languages where it exists (2)", async () => {
    const res = await axios.post("/copy-key", { from: "bar", to: "bar_copy" });

    expect(res.status).toEqual(200);
    expect(res.data).toEqual("Copied key in fr, de_DE.");

    expect(await axios.get("/localizations/fr/bar_copy")).toHaveProperty(
      "data",
      "test"
    );
    expect(await axios.get("/localizations/fr_BE/bar_copy")).toHaveProperty(
      "data",
      "test"
    );
    expect(await axios.get("/localizations/fr_BE/b2b/bar_copy")).toHaveProperty(
      "data",
      "test"
    );
    expect(await axios.get("/localizations/de/bar_copy")).toHaveProperty(
      "status",
      404
    );
    expect(await axios.get("/localizations/de_DE/bar_copy")).toHaveProperty(
      "data",
      "test_other"
    );
  });
});
