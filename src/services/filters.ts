import { LocalizationWithBaseType } from "./localizations.service";

export type Filters = Partial<
  Record<
    keyof Pick<LocalizationWithBaseType, "key" | "base" | "tr">,
    RegExp
  > & {
    onlyMissing: boolean;
    onlyDupes: boolean;
    onlyEmpty: boolean;
  }
>;

export function filterTranslations(
  translations: LocalizationWithBaseType[],
  filters: Filters
): LocalizationWithBaseType[] {
  return translations
    .filter(
      (e) =>
        (filters.onlyMissing === true && e.missing) ||
        (filters.onlyDupes === true && e.dupe) ||
        (filters.onlyEmpty === true && e.tr?.trim() === "") ||
        (!filters.onlyMissing && !filters.onlyDupes && !filters.onlyEmpty)
    )
    .filter(
      (e) =>
        (!filters.key || filters.key.test(e.key)) &&
        (!filters.base || filters.base.test(e.base)) &&
        (!filters.tr || filters.tr.test(e.tr))
    );
}
