const axios = require("axios");
const _ = require("lodash");

describe("Server Config", () => {
  beforeAll(async () => {
    await axios.post("http://localhost:8000/config", {});
  });

  it("should start up", async () => {
    const res = await axios.get("http://localhost:8000/config");
    expect(res.status).toEqual(200);
    expect(res.data).toMatchInlineSnapshot(`
      Object {
        "block": false,
        "translateAvailable": false,
      }
    `);
  });

  describe("when pushing a whole config", () => {
    it("should respond with 204", async () => {
      const res = await axios.post("http://localhost:8000/config", {
        foo: "test",
        bar: "foobar",
      });
      expect(res.status).toEqual(204);
      expect(res.data).toBeEmpty();
    });

    it("should have the new data set in config response", async () => {
      const res = await axios.get("http://localhost:8000/config");
      expect(res.status).toEqual(200);
      expect(_.pick(res.data, "foo", "bar")).toMatchInlineSnapshot(`
        Object {
          "bar": "foobar",
          "foo": "test",
        }
      `);
    });

    it("should have the new data set in config detail response", async () => {
      const res = await axios.get("http://localhost:8000/config/foo");
      expect(res.status).toEqual(200);
      expect(res.data).toEqual("test");
    });
  });

  describe("when setting a string config field", () => {
    it("should respond with 204", async () => {
      const res = await axios.put(
        "http://localhost:8000/config/dummy",
        "test",
        { headers: { "Content-Type": "text/plain" } }
      );
      expect(res.status).toEqual(204);
      expect(res.data).toBeEmpty();
    });

    it("should have the new data set in config detail response", async () => {
      const res = await axios.get("http://localhost:8000/config/dummy");
      expect(res.status).toEqual(200);
      expect(res.data).toEqual("test");
    });

    it("should have the new data set in config response", async () => {
      const res = await axios.get("http://localhost:8000/config");
      expect(res.status).toEqual(200);
      expect(res.data.dummy).toEqual("test");
    });

    describe("when deleting the field", () => {
      it("should respond with 204", async () => {
        const res = await axios.delete("http://localhost:8000/config/dummy");
        expect(res.status).toEqual(204);
        expect(res.data).toBeEmpty();
      });

      it("should not have the data set in config detail response", async () => {
        const res = await axios
          .get("http://localhost:8000/config/dummy")
          .catch((err) => err.response);
        expect(res.status).toEqual(404);
      });

      it("should not have the data set in config response", async () => {
        const res = await axios.get("http://localhost:8000/config");
        expect(res.status).toEqual(200);
        expect(res.data.dummy).toBeUndefined();
      });
    });
  });

  describe("when setting a boolean config field", () => {
    it("should respond with 204", async () => {
      const res = await axios.put(
        "http://localhost:8000/config/dummy",
        "true",
        { headers: { "Content-Type": "text/plain" } }
      );
      expect(res.status).toEqual(204);
      expect(res.data).toBeEmpty();
    });

    it("should have the new data set in config detail response", async () => {
      const res = await axios.get("http://localhost:8000/config/dummy");
      expect(res.status).toEqual(200);
      expect(res.data).toBeTrue();
    });

    it("should have the new data set in config response", async () => {
      const res = await axios.get("http://localhost:8000/config");
      expect(res.status).toEqual(200);
      expect(res.data.dummy).toBeTrue();
    });

    describe("when deleting the field", () => {
      it("should respond with 204", async () => {
        const res = await axios.delete("http://localhost:8000/config/dummy");
        expect(res.status).toEqual(204);
        expect(res.data).toBeEmpty();
      });

      it("should not have the data set in config detail response", async () => {
        const res = await axios
          .get("http://localhost:8000/config/dummy")
          .catch((err) => err.response);
        expect(res.status).toEqual(404);
      });

      it("should not have the data set in config response", async () => {
        const res = await axios.get("http://localhost:8000/config");
        expect(res.status).toEqual(200);
        expect(res.data.dummy).toBeUndefined();
      });
    });
  });

  describe("when setting an object config field", () => {
    it("should respond with 204", async () => {
      const res = await axios.put("http://localhost:8000/config/dummy", [
        "foo",
        "bar",
      ]);
      expect(res.status).toEqual(204);
      expect(res.data).toBeEmpty();
    });

    it("should have the new data set in config detail response", async () => {
      const res = await axios.get("http://localhost:8000/config/dummy");
      expect(res.status).toEqual(200);
      expect(res.data).toMatchInlineSnapshot(`
        Array [
          "foo",
          "bar",
        ]
      `);
    });

    it("should have the new data set in config response", async () => {
      const res = await axios.get("http://localhost:8000/config");
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
        const res = await axios.delete("http://localhost:8000/config/dummy");
        expect(res.status).toEqual(204);
        expect(res.data).toBeEmpty();
      });

      it("should not have the data set in config detail response", async () => {
        const res = await axios
          .get("http://localhost:8000/config/dummy")
          .catch((err) => err.response);
        expect(res.status).toEqual(404);
      });

      it("should not have the data set in config response", async () => {
        const res = await axios.get("http://localhost:8000/config");
        expect(res.status).toEqual(200);
        expect(res.data.dummy).toBeUndefined();
      });
    });
  });

  describe("when setting the block config field", () => {
    it("should respond with 204", async () => {
      const res = await axios.put("http://localhost:8000/config/block");
      expect(res.status).toEqual(204);
      expect(res.data).toBeEmpty();
    });

    it("should have the new data set in config detail response", async () => {
      const res = await axios.get("http://localhost:8000/config/block");
      expect(res.status).toEqual(200);
      expect(res.data).toBeTrue();
    });

    it("should have the new data set in config response", async () => {
      const res = await axios.get("http://localhost:8000/config");
      expect(res.status).toEqual(200);
      expect(res.data.block).toBeTrue();
    });

    describe("when deleting the field", () => {
      it("should respond with 204", async () => {
        const res = await axios.delete("http://localhost:8000/config/block");
        expect(res.status).toEqual(204);
        expect(res.data).toBeEmpty();
      });

      it("should be false in the config detail response", async () => {
        const res = await axios.get("http://localhost:8000/config/block");
        expect(res.status).toEqual(200);
        expect(res.data).toBeFalse();
      });

      it("should not have the data set in config response", async () => {
        const res = await axios.get("http://localhost:8000/config");
        expect(res.status).toEqual(200);
        expect(res.data.block).toBeFalse();
      });
    });
  });

  describe("when setting a readonly config field", () => {
    it("should respond with 405", async () => {
      const res = await axios
        .put("http://localhost:8000/config/translateAvailable")
        .catch((err) => err.response);
      expect(res.status).toEqual(405);
    });
  });

  describe("when deleting a readonly config field", () => {
    it("should respond with 405", async () => {
      const res = await axios
        .delete("http://localhost:8000/config/translateAvailable")
        .catch((err) => err.response);
      expect(res.status).toEqual(405);
    });
  });
});
