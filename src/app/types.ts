// Shared app types (docs/SPEC.md §5).
export type Lang = 'te' | 'en';
export type Theme = 'system' | 'light' | 'dark';

export type Settings = {
  lang: Lang;
  homePlaceId: string;
  elderText: boolean;
  theme: Theme;
};
