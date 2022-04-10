export interface Config {
  baseLang: string;
  locales: string[];
  themes: string[];
  combinations: { [locale: string]: string[] };
  maintenance: boolean;
  ignored: string[];

  translateAvailable: boolean;
  languages: string[];
  block: boolean;
}

export type Translations = { [key: string]: string };

export type OverridesList = string[];

export interface Override {
  id: string;
  lang: string;
  country: string;
  locale: string;
  theme: string;
  interpolated: string;
  value: string;
  updateLang: string;
  url: string;
}
