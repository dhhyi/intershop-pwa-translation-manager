import { filterTranslations } from "./filters";
import { LocalizationWithBaseType } from "./localizations.service";

describe("Translation Filtering", () => {
  expect.addSnapshotSerializer({
    test: (v: LocalizationWithBaseType) => !!v.key,
    print: (v) => `${(v as LocalizationWithBaseType).key}`,
  });

  const data: LocalizationWithBaseType[] = [
    { key: "simple", base: "simple key", tr: "einfacher key" },
    { key: "missing", base: "missing key", tr: undefined, missing: true },
    { key: "dupe", base: "dupe key", tr: "dupe key", dupe: true },
    { key: "empty", base: "empty key", tr: "" },
  ];

  it("should return empty array for empty data", () => {
    expect(filterTranslations([], {})).toMatchInlineSnapshot(`Array []`);
  });

  it("should return input when no filters are set", () => {
    expect(filterTranslations(data, {})).toMatchInlineSnapshot(`
      Array [
        simple,
        missing,
        dupe,
        empty,
      ]
    `);
  });

  it("should return empty keys when filtering for it", () => {
    expect(filterTranslations(data, { onlyEmpty: true }))
      .toMatchInlineSnapshot(`
      Array [
        empty,
      ]
    `);
  });

  it("should return missing keys when filtering for it", () => {
    expect(filterTranslations(data, { onlyMissing: true }))
      .toMatchInlineSnapshot(`
      Array [
        missing,
      ]
    `);
  });

  it("should return dupe keys when filtering for it", () => {
    expect(filterTranslations(data, { onlyDupes: true }))
      .toMatchInlineSnapshot(`
      Array [
        dupe,
      ]
    `);
  });

  it("should return empty and dupe keys when filtering for it", () => {
    expect(filterTranslations(data, { onlyDupes: true, onlyEmpty: true }))
      .toMatchInlineSnapshot(`
      Array [
        dupe,
        empty,
      ]
    `);
  });

  it("should filter using regular expressions when supplied on one field", () => {
    expect(filterTranslations(data, { base: /key/ })).toMatchInlineSnapshot(`
      Array [
        simple,
        missing,
        dupe,
        empty,
      ]
    `);
  });

  it("should filter using regular expressions when supplied on multiple fields", () => {
    expect(filterTranslations(data, { base: /key/, tr: /k/ }))
      .toMatchInlineSnapshot(`
      Array [
        simple,
        dupe,
      ]
    `);
  });

  it("should filter using multiple filters", () => {
    expect(filterTranslations(data, { tr: /k/, onlyDupes: true }))
      .toMatchInlineSnapshot(`
      Array [
        dupe,
      ]
    `);
  });
});
