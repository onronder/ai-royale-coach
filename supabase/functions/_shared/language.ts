export const supportedLanguages = ['en', 'tr', 'es', 'fr', 'pt'] as const;
export type Language = typeof supportedLanguages[number];

export function baseLanguage(value: string): string {
  return value.trim().toLowerCase().split(/[-_]/, 1)[0];
}

export function productLanguage(value: unknown): Language {
  const base = typeof value === 'string' ? baseLanguage(value) : '';
  return supportedLanguages.find(language => language === base) ?? 'en';
}
