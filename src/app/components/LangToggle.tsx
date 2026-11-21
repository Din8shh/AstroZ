import { useSettings } from '../store/settings';
import { useT } from '../i18n';
import type { Lang } from '../types';
import s from './LangToggle.module.css';

const OPTIONS: { value: Lang; short: string; labelKey: 'lang.te' | 'lang.en' }[] = [
  { value: 'te', short: 'తె', labelKey: 'lang.te' },
  { value: 'en', short: 'EN', labelKey: 'lang.en' },
];

export function LangToggle() {
  const lang = useSettings((st) => st.lang);
  const setLang = useSettings((st) => st.setLang);
  const t = useT();
  return (
    <div className={s.root} role="radiogroup" aria-label={t('lang.groupLabel')}>
      {OPTIONS.map((o) => {
        const on = o.value === lang;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={t(o.labelKey)}
            lang={o.value}
            className={[s.opt, s[o.value], on && s.on].filter(Boolean).join(' ')}
            onClick={() => setLang(o.value)}
          >
            {o.short}
          </button>
        );
      })}
    </div>
  );
}
