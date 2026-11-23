import { useT } from '../i18n';
import { useSettings } from '../store/settings';
import { LangToggle } from './LangToggle';
import s from './AppHeader.module.css';

export function AppHeader() {
  const t = useT();
  const lang = useSettings((st) => st.lang);
  const elder = useSettings((st) => st.elderText);
  const setElder = useSettings((st) => st.setElderText);
  return (
    <header className={s.header}>
      <span className={s.brand}>{t('app.name')}</span>
      <div className={s.tools}>
        {/* design/handoff TodayTeOffline: the "అ+" larger-text button next to the language toggle */}
        <button type="button" className={s.elder} aria-pressed={elder} aria-label={t('header.elder')} onClick={() => setElder(!elder)}>
          <span aria-hidden="true" lang={lang}>{lang === 'te' ? 'అ+' : 'A+'}</span>
        </button>
        <LangToggle />
      </div>
    </header>
  );
}
