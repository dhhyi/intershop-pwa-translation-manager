import axios from 'axios';

describe('Server Overrides', () => {
  expect.addSnapshotSerializer({
    test: (v: any) => typeof v?.id === 'string' && typeof v?.url === 'string',
    print: (v: any) =>
      `${v.updateLang.padEnd(10, ' ')} ${v.value ? '*' : ' '} ${
        v.interpolated
      }`,
  });

  const data = [
    ['en', 'English base value'],
    ['de', 'Translated base value'],
    ['de/b2c', 'b2c language-theme override'],
    ['de-de/b2b', 'b2b locale-theme override'],
    ['en/b2b', 'b2b language-theme override'],
  ];

  beforeAll(async () => {
    const deleteDB = await axios.delete('/db', {});
    expect(deleteDB.status).toEqual(204);

    const config = await axios.put('/config/locales', ['de_DE', 'en_US']);
    expect(config.status).toEqual(204);

    const themes = await axios.put('/config/themes', ['b2c', 'b2b']);
    expect(themes.status).toEqual(204);

    for (const [id, value] of data) {
      const res = await axios.put(`/localizations/${id}/dummy`, value, {
        headers: { 'Content-Type': 'text/plain' },
      });
      expect(res.data).toBeEmpty();

      expect(res.status).toEqual(204);
    }
  });

  describe('detail call', () => {
    it('should return all overrides for configured key if no language was given', async () => {
      const res = await axios.get('/overrides/dummy');
      expect(res).toHaveProperty('status', 200);
      expect(res.data).toMatchInlineSnapshot(`
        Array [
          de         * Translated base value,
          de/b2b       Translated base value,
          de/b2c     * b2c language-theme override,
          de_DE        Translated base value,
          de_DE/b2b  * b2b locale-theme override,
          de_DE/b2c    b2c language-theme override,
          en         * English base value,
          en/b2b     * b2b language-theme override,
          en/b2c       English base value,
          en_US        English base value,
          en_US/b2b    b2b language-theme override,
          en_US/b2c    English base value,
        ]
      `);
    });

    it('should return overrides for configured key in language if given', async () => {
      const res = await axios.get('/overrides/de/dummy');
      expect(res).toHaveProperty('status', 200);
      expect(res.data).toMatchInlineSnapshot(`
        Array [
          de         * Translated base value,
          de/b2b       Translated base value,
          de/b2c     * b2c language-theme override,
          de_DE        Translated base value,
          de_DE/b2b  * b2b locale-theme override,
          de_DE/b2c    b2c language-theme override,
        ]
      `);
    });

    it('should fail if requested language is not configured', async () => {
      const res = await axios.get('/overrides/jp/dummy');
      expect(res).toHaveProperty('status', 400);
      expect(res.data).toMatchInlineSnapshot(
        `"Language jp is not configured."`
      );
    });

    describe('after deleting an override', () => {
      beforeAll(async () => {
        const res = await axios.delete('/localizations/de_DE/b2b/dummy');
        expect(res.status).toEqual(204);
      });

      it('should return overrides for configured key in language if given', async () => {
        const res = await axios.get('/overrides/de/dummy');
        expect(res).toHaveProperty('status', 200);
        expect(res.data).toMatchInlineSnapshot(`
          Array [
            de         * Translated base value,
            de/b2b       Translated base value,
            de/b2c     * b2c language-theme override,
            de_DE        Translated base value,
            de_DE/b2b    Translated base value,
            de_DE/b2c    b2c language-theme override,
          ]
        `);
      });
    });
  });

  describe('list call', () => {
    it('should return all keys with overrides', async () => {
      const res = await axios.get('/overrides-list');
      expect(res).toHaveProperty('status', 200);
      expect(res.data).toMatchInlineSnapshot(`
        Array [
          "dummy",
        ]
      `);
    });

    it('should return overrides for configured key in language if given', async () => {
      const res = await axios.get('/overrides-list/de');
      expect(res).toHaveProperty('status', 200);
      expect(res.data).toMatchInlineSnapshot(`
        Array [
          "dummy",
        ]
      `);
    });

    it('should fail if requested language is not configured', async () => {
      const res = await axios.get('/overrides-list/jp');
      expect(res).toHaveProperty('status', 400);
      expect(res.data).toMatchInlineSnapshot(
        `"Language jp is not configured."`
      );
    });
  });
});
