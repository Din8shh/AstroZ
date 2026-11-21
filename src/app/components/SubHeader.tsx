import { useT } from '../i18n';
import { Icon } from './Icon';
import { LangToggle } from './LangToggle';
import s from '../screens/Family.module.css';

/** Header for screens opened from a tab (form, reveal): close/back, title, language toggle. */
export function SubHeader({ title, backHref }: { title: string; backHref: string }) {
  const t = useT();
  return (
    <header className={s.subHeader}>
      <div className={s.subLeft}>
        <a className={s.back} href={backHref} aria-label={t('form.close')}><span><Icon name="chevron-right" /></span></a>
        <h1 className={s.subTitle}>{title}</h1>
      </div>
      <LangToggle />
    </header>
  );
}
