import { useT } from '../i18n';
import { LangToggle } from './LangToggle';
import s from './AppHeader.module.css';

export function AppHeader() {
  const t = useT();
  return (
    <header className={s.header}>
      <span className={s.brand}>{t('app.name')}</span>
      <LangToggle />
    </header>
  );
}
