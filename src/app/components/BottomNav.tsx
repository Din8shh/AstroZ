import { hrefFor, type Tab } from '../router';
import { useT, type MessageKey } from '../i18n';
import { Icon } from './Icon';
import type { IconName } from './icons';
import s from './BottomNav.module.css';

const ITEMS: { id: Tab; icon: IconName; label: MessageKey }[] = [
  { id: 'today', icon: 'sunrise', label: 'nav.today' },
  { id: 'wishes', icon: 'kalasham', label: 'nav.wishes' },
  { id: 'future', icon: 'nakshatram', label: 'nav.future' },
  { id: 'family', icon: 'family', label: 'nav.family' },
  { id: 'more', icon: 'more', label: 'nav.more' },
];

export function BottomNav({ active }: { active: Tab }) {
  const t = useT();
  return (
    <nav className={s.nav} aria-label={t('nav.label')}>
      {ITEMS.map((n) => {
        const on = n.id === active;
        return (
          <a key={n.id} href={hrefFor(n.id)} className={on ? `${s.item} ${s.on}` : s.item} aria-current={on ? 'page' : undefined}>
            <span className={s.pill}><Icon name={n.icon} /></span>
            <span className={s.label}>{t(n.label)}</span>
          </a>
        );
      })}
    </nav>
  );
}
