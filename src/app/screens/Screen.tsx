import type { ReactNode } from 'react';
import { useT, type MessageKey } from '../i18n';
import { Icon } from '../components/Icon';
import s from './Screen.module.css';

type Props = { title: MessageKey; intro?: MessageKey; privacy?: MessageKey; children?: ReactNode };

/** Placeholder screen frame. Real content arrives phase by phase (docs/SPEC.md §9). */
export function Screen({ title, intro, privacy, children }: Props) {
  const t = useT();
  return (
    <main className={s.main} id="main">
      <div className={s.head}>
        <h1 className={s.title}>{t(title)}</h1>
        {intro ? <p className={s.intro}>{t(intro)}</p> : null}
      </div>
      {children}
      {privacy ? (
        <p className={s.privacy}>
          <span className={s.privacyIcon}><Icon name="lock" size={20} /></span>
          {t(privacy)}
        </p>
      ) : null}
    </main>
  );
}

export const screenStyles = s;
