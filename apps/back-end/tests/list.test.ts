import axios from "axios";
import { Override } from "@pwa-translation-manager/api";

describe("Server List", () => {
  expect.addSnapshotSerializer({
    test: (v) => typeof v?.id === "string" && typeof v?.url === "string",
    print: (v: Override) => `${v.id.padEnd(10, " ")} ${v.url}`,
  });

  const initialData = {
    foo: "test",
    bar: "test",
  };

  beforeAll(async () => {
    const deleteDB = await axios.delete("/db", {});
    expect(deleteDB.status).toEqual(204);

    const configRes = await axios.post("/config", {
      locales: ["en_US", "de_DE", "de_AT", "fr_BE", "fr_FR", "es_ES"],
      themes: ["b2b", "b2c"],
      baseLang: "en",
    });
    expect(configRes.data).toBeEmpty();
    expect(configRes.status).toEqual(204);

    const combinationsRes = await axios.put("/config/combinations", {
      en_US: ["b2c", "b2b"],
      de_DE: ["b2c", "b2b"],
      de_AT: ["b2c"],
      fr_FR: ["b2b"],
      fr_BE: ["b2c"],
      es_ES: ["b2c"],
    });
    expect(combinationsRes.data).toBeEmpty();
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

  describe("combinations query", () => {
    let listResponse;

    it("should return all combinations respecting supplied combinations in the list response", async () => {
      listResponse = await axios.get("/list?query=combinations");
      expect(listResponse.status).toEqual(200);
      expect(listResponse.data).toMatchInlineSnapshot(`
        Array [
          de         http://localhost:8001/localizations/de?unblocked=true,
          de-b2b     http://localhost:8001/localizations/de/b2b?unblocked=true,
          de-b2c     http://localhost:8001/localizations/de/b2c?unblocked=true,
          de_AT      http://localhost:8001/localizations/de_AT?unblocked=true,
          de_AT-b2c  http://localhost:8001/localizations/de_AT/b2c?unblocked=true,
          de_DE      http://localhost:8001/localizations/de_DE?unblocked=true,
          de_DE-b2b  http://localhost:8001/localizations/de_DE/b2b?unblocked=true,
          de_DE-b2c  http://localhost:8001/localizations/de_DE/b2c?unblocked=true,
          en         http://localhost:8001/localizations/en?unblocked=true,
          en-b2b     http://localhost:8001/localizations/en/b2b?unblocked=true,
          en-b2c     http://localhost:8001/localizations/en/b2c?unblocked=true,
          en_US      http://localhost:8001/localizations/en_US?unblocked=true,
          en_US-b2b  http://localhost:8001/localizations/en_US/b2b?unblocked=true,
          en_US-b2c  http://localhost:8001/localizations/en_US/b2c?unblocked=true,
          es         http://localhost:8001/localizations/es?unblocked=true,
          es-b2c     http://localhost:8001/localizations/es/b2c?unblocked=true,
          es_ES      http://localhost:8001/localizations/es_ES?unblocked=true,
          es_ES-b2c  http://localhost:8001/localizations/es_ES/b2c?unblocked=true,
          fr         http://localhost:8001/localizations/fr?unblocked=true,
          fr-b2b     http://localhost:8001/localizations/fr/b2b?unblocked=true,
          fr-b2c     http://localhost:8001/localizations/fr/b2c?unblocked=true,
          fr_BE      http://localhost:8001/localizations/fr_BE?unblocked=true,
          fr_BE-b2c  http://localhost:8001/localizations/fr_BE/b2c?unblocked=true,
          fr_FR      http://localhost:8001/localizations/fr_FR?unblocked=true,
          fr_FR-b2b  http://localhost:8001/localizations/fr_FR/b2b?unblocked=true,
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

  describe("if no combinations are configured", () => {
    beforeAll(async () => {
      const res = await axios.put("/config/combinations", {});
      expect(res.status).toEqual(204);
    });

    it("should not report an error when retrieving combination entries", async () => {
      const res = await axios.get("/list?query=combinations");
      expect(res.status).toEqual(200);
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

  describe("combinations query without restriction", () => {
    let listResponse;

    it("should return all possible combinations in the list response", async () => {
      listResponse = await axios.get("/list?query=combinations");
      expect(listResponse.status).toEqual(200);
      expect(listResponse.data).toMatchInlineSnapshot(`
        Array [
          de         http://localhost:8001/localizations/de?unblocked=true,
          de-b2b     http://localhost:8001/localizations/de/b2b?unblocked=true,
          de-b2c     http://localhost:8001/localizations/de/b2c?unblocked=true,
          de_AT      http://localhost:8001/localizations/de_AT?unblocked=true,
          de_AT-b2b  http://localhost:8001/localizations/de_AT/b2b?unblocked=true,
          de_AT-b2c  http://localhost:8001/localizations/de_AT/b2c?unblocked=true,
          de_DE      http://localhost:8001/localizations/de_DE?unblocked=true,
          de_DE-b2b  http://localhost:8001/localizations/de_DE/b2b?unblocked=true,
          de_DE-b2c  http://localhost:8001/localizations/de_DE/b2c?unblocked=true,
          en         http://localhost:8001/localizations/en?unblocked=true,
          en-b2b     http://localhost:8001/localizations/en/b2b?unblocked=true,
          en-b2c     http://localhost:8001/localizations/en/b2c?unblocked=true,
          en_US      http://localhost:8001/localizations/en_US?unblocked=true,
          en_US-b2b  http://localhost:8001/localizations/en_US/b2b?unblocked=true,
          en_US-b2c  http://localhost:8001/localizations/en_US/b2c?unblocked=true,
          es         http://localhost:8001/localizations/es?unblocked=true,
          es-b2b     http://localhost:8001/localizations/es/b2b?unblocked=true,
          es-b2c     http://localhost:8001/localizations/es/b2c?unblocked=true,
          es_ES      http://localhost:8001/localizations/es_ES?unblocked=true,
          es_ES-b2b  http://localhost:8001/localizations/es_ES/b2b?unblocked=true,
          es_ES-b2c  http://localhost:8001/localizations/es_ES/b2c?unblocked=true,
          fr         http://localhost:8001/localizations/fr?unblocked=true,
          fr-b2b     http://localhost:8001/localizations/fr/b2b?unblocked=true,
          fr-b2c     http://localhost:8001/localizations/fr/b2c?unblocked=true,
          fr_BE      http://localhost:8001/localizations/fr_BE?unblocked=true,
          fr_BE-b2b  http://localhost:8001/localizations/fr_BE/b2b?unblocked=true,
          fr_BE-b2c  http://localhost:8001/localizations/fr_BE/b2c?unblocked=true,
          fr_FR      http://localhost:8001/localizations/fr_FR?unblocked=true,
          fr_FR-b2b  http://localhost:8001/localizations/fr_FR/b2b?unblocked=true,
          fr_FR-b2c  http://localhost:8001/localizations/fr_FR/b2c?unblocked=true,
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
          de_AT      http://localhost:8001/localizations/de_AT?unblocked=true,
          de_DE      http://localhost:8001/localizations/de_DE?unblocked=true,
          en_US      http://localhost:8001/localizations/en_US?unblocked=true,
          es_ES      http://localhost:8001/localizations/es_ES?unblocked=true,
          fr_BE      http://localhost:8001/localizations/fr_BE?unblocked=true,
          fr_FR      http://localhost:8001/localizations/fr_FR?unblocked=true,
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
          de         http://localhost:8001/localizations/de?unblocked=true,
          en         http://localhost:8001/localizations/en?unblocked=true,
          es         http://localhost:8001/localizations/es?unblocked=true,
          fr         http://localhost:8001/localizations/fr?unblocked=true,
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

  describe("if no themes are configured", () => {
    beforeAll(async () => {
      const res = await axios.put("/config/themes", []);
      expect(res.status).toEqual(204);
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
