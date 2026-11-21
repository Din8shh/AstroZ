import { Icon } from './Icon';
import type { IconName } from './icons';
import s from './WishCard.module.css';

export function WishCard({ icon, title, subtitle, href }: { icon: IconName; title: string; subtitle: string; href?: string }) {
  const inner = (
    <>
      <span className={s.icon}><Icon name={icon} size={28} /></span>
      <span className={s.text}><span className={s.title}>{title}</span><span className={s.sub}>{subtitle}</span></span>
      <span className={s.chev}><Icon name="chevron-right" size={20} /></span>
    </>
  );
  return href ? <a className={s.wish} href={href}>{inner}</a> : <div className={`${s.wish} ${s.disabled}`} aria-disabled="true">{inner}</div>;
}
