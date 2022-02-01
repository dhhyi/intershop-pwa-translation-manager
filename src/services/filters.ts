import {
  LocalizationWithBaseType,
  OverridesType,
} from "./localizations.service";

export type TranslationFilters = Partial<
  Record<
    keyof Pick<LocalizationWithBaseType, "key" | "base" | "tr">,
    RegExp
  > & {
    onlyMissing: boolean;
    onlyDupes: boolean;
    onlyEmpty: boolean;
    onlyComplex: boolean;
    onlyOverridden: boolean;
  }
>;

export type OverridesFilters = Partial<{
  type: undefined | "lang" | "locale" | "theme" | "lang+theme" | "locale+theme";
}>;

function containsComplex(v: string) {
  return /\{\{(\s*\w+\s*,)?\s*(translate|plural|select)/.test(v);
}

export function filterTranslations(
  translations: LocalizationWithBaseType[],
  filters: TranslationFilters
): LocalizationWithBaseType[] {
  return translations
    .filter(
      (e) =>
        (filters.onlyMissing === true && e.missing) ||
        (filters.onlyDupes === true && e.dupe) ||
        (filters.onlyEmpty === true && e.tr?.trim() === "") ||
        (filters.onlyComplex === true &&
          (containsComplex(e.base) || containsComplex(e.tr))) ||
        (filters.onlyOverridden === true && e.overridden) ||
        (!filters.onlyMissing &&
          !filters.onlyDupes &&
          !filters.onlyEmpty &&
          !filters.onlyComplex &&
          !filters.onlyOverridden)
    )
    .filter(
      (e) =>
        (!filters.key || filters.key.test(e.key)) &&
        (!filters.base || filters.base.test(e.base)) &&
        (!filters.tr || filters.tr.test(e.tr))
    );
}

export function filterOverrides(
  overrides: OverridesType[],
  filters: OverridesFilters
): OverridesType[] {
  return overrides.filter((element) => {
    switch (filters.type) {
      case "lang":
        return !element.locale;
      case "locale":
        return element.locale;
      case "theme":
        return element.theme;
      case "lang+theme":
        return element.theme && !element.locale;
      case "locale+theme":
        return element.locale && element.theme;
      default:
        return true;
    }
  });
}
