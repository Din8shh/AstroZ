import { create } from 'zustand';
import { get, set } from 'idb-keyval';
import type { Lang, Settings, Theme } from '../types';

const KEY = 'settings';

export const DEFAULT_SETTINGS: Settings = {
  lang: 'te',
  homePlaceId: '1269843', // GeoNames id: Hyderabad
  elderText: false,
  theme: 'system',
};

type SettingsState = Settings & {
  loaded: boolean;
  setLang: (lang: Lang) => void;
  setTheme: (theme: Theme) => void;
  setElderText: (on: boolean) => void;
  setHomePlaceId: (id: string) => void;
  load: () => Promise<void>;
};

function pick(s: SettingsState): Settings {
  return { lang: s.lang, homePlaceId: s.homePlaceId, elderText: s.elderText, theme: s.theme };
}

export const useSettings = create<SettingsState>()((setState, getState) => {
  const save = () => {
    // IndexedDB can be unavailable (private mode, blocked storage): the app still works, it just forgets.
    set(KEY, pick(getState())).catch(() => undefined);
  };
  return {
    ...DEFAULT_SETTINGS,
    loaded: false,
    setLang: (lang) => { setState({ lang }); save(); },
    setTheme: (theme) => { setState({ theme }); save(); },
    setElderText: (elderText) => { setState({ elderText }); save(); },
    setHomePlaceId: (homePlaceId) => { setState({ homePlaceId }); save(); },
    load: async () => {
      try {
        const stored = await get<Partial<Settings>>(KEY);
        setState({ ...DEFAULT_SETTINGS, ...stored, loaded: true });
      } catch {
        setState({ loaded: true });
      }
    },
  };
});
