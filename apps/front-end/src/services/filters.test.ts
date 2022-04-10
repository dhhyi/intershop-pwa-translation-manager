import { filterOverrides, filterTranslations } from './filters';
import {
  LocalizationWithBaseType,
  OverridesType,
} from './localizations.service';

describe('Translation Filtering', () => {
  describe('filterTranslations', () => {
    expect.addSnapshotSerializer({
      test: (v: LocalizationWithBaseType) => !!v.key,
      print: (v) => `${(v as LocalizationWithBaseType).key}`,
    });

    const data: LocalizationWithBaseType[] = [
      { key: 'simple', base: 'simple key', tr: 'einfacher key' },
      { key: 'missing', base: 'missing key', tr: undefined, missing: true },
      { key: 'dupe', base: 'dupe key', tr: 'dupe key', dupe: true },
      { key: 'empty', base: 'empty key', tr: '' },
      {
        key: 'overridden',
        base: 'overridden key',
        tr: 'overridden key',
        overridden: true,
      },
      { key: 'variable', base: '{{ 0 }}', tr: '{{ 0 }}' },
      {
        key: 'plural',
        base: '{{o, plural, =1{one} other{more}}}',
        tr: '{{o, plural, =1{eins} other{mehr}}}',
      },
      {
        key: 'select',
        base: '{{o, select, =true{true} other{false}}}',
        tr: '{{o, select, =true{wahr} other{falsch}}}',
      },
      {
        key: 'translate',
        base: '{{translate, simple}}',
        tr: '{{translate, simple}}',
      },
    ];

    it('should return empty array for empty data', () => {
      expect(filterTranslations([], {})).toMatchInlineSnapshot(`Array []`);
    });

    it('should return input when no filters are set', () => {
      expect(filterTranslations(data, {})).toMatchInlineSnapshot(`
        Array [
          simple,
          missing,
          dupe,
          empty,
          overridden,
          variable,
          plural,
          select,
          translate,
        ]
      `);
    });

    it('should return empty keys when filtering for it', () => {
      expect(filterTranslations(data, { onlyEmpty: true }))
        .toMatchInlineSnapshot(`
        Array [
          empty,
        ]
      `);
    });

    it('should return missing keys when filtering for it', () => {
      expect(filterTranslations(data, { onlyMissing: true }))
        .toMatchInlineSnapshot(`
        Array [
          missing,
        ]
      `);
    });

    it('should return dupe keys when filtering for it', () => {
      expect(filterTranslations(data, { onlyDupes: true }))
        .toMatchInlineSnapshot(`
        Array [
          dupe,
        ]
      `);
    });

    it('should return overridden keys when filtering for it', () => {
      expect(filterTranslations(data, { onlyOverridden: true }))
        .toMatchInlineSnapshot(`
        Array [
          overridden,
        ]
      `);
    });

    it('should return complex keys when filtering for it', () => {
      expect(filterTranslations(data, { onlyComplex: true }))
        .toMatchInlineSnapshot(`
        Array [
          plural,
          select,
          translate,
        ]
      `);
    });

    it('should return empty and dupe keys when filtering for it', () => {
      expect(filterTranslations(data, { onlyDupes: true, onlyEmpty: true }))
        .toMatchInlineSnapshot(`
        Array [
          dupe,
          empty,
        ]
      `);
    });

    it('should filter using regular expressions when supplied on one field', () => {
      expect(filterTranslations(data, { base: /key/ })).toMatchInlineSnapshot(`
        Array [
          simple,
          missing,
          dupe,
          empty,
          overridden,
        ]
      `);
    });

    it('should filter using regular expressions when supplied on multiple fields', () => {
      expect(filterTranslations(data, { base: /key/, tr: /k/ }))
        .toMatchInlineSnapshot(`
        Array [
          simple,
          dupe,
          overridden,
        ]
      `);
    });

    it('should filter using multiple filters', () => {
      expect(filterTranslations(data, { tr: /k/, onlyDupes: true }))
        .toMatchInlineSnapshot(`
        Array [
          dupe,
        ]
      `);
    });
  });

  describe('filterOverrides', () => {
    expect.addSnapshotSerializer({
      test: (v: OverridesType) => !!v.id,
      print: (v) => `${(v as OverridesType).id}`,
    });

    const data = [
      { id: 'de', lang: 'de' },
      { id: 'de-theme', lang: 'de', theme: 'theme' },
      { id: 'de_DE', lang: 'de', country: 'DE', locale: 'de_DE' },
      {
        id: 'de_DE-theme',
        lang: 'de',
        country: 'DE',
        locale: 'de_DE',
        theme: 'theme',
      },
    ] as OverridesType[];

    it('should return empty array for empty data', () => {
      expect(filterOverrides([], {})).toMatchInlineSnapshot(`Array []`);
    });

    it('should return input when no filters are set', () => {
      expect(filterOverrides(data, {})).toMatchInlineSnapshot(`
        Array [
          de,
          de-theme,
          de_DE,
          de_DE-theme,
        ]
      `);
    });

    it('should return languages', () => {
      expect(filterOverrides(data, { type: 'lang' })).toMatchInlineSnapshot(`
        Array [
          de,
        ]
      `);
    });

    it('should return locales', () => {
      expect(filterOverrides(data, { type: 'locale' })).toMatchInlineSnapshot(`
        Array [
          de_DE,
        ]
      `);
    });

    it('should return themes', () => {
      expect(filterOverrides(data, { type: 'theme' })).toMatchInlineSnapshot(`
        Array [
          de-theme,
          de_DE-theme,
        ]
      `);
    });

    it('should return language x themes', () => {
      expect(filterOverrides(data, { type: 'lang+theme' }))
        .toMatchInlineSnapshot(`
        Array [
          de-theme,
        ]
      `);
    });

    it('should return locale x themes', () => {
      expect(filterOverrides(data, { type: 'locale+theme' }))
        .toMatchInlineSnapshot(`
        Array [
          de_DE-theme,
        ]
      `);
    });
  });
});
