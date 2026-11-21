import { Icon } from './Icon';
import s from './ProfileChip.module.css';

/** Avatar letter: the first letter only, as in the design (శ్రావణి → శ, Sravani → S). */
export const initialOf = (name: string) => (Array.from(name.trim())[0] ?? '').toLocaleUpperCase();

type Props = { name: string; sub?: string; selected?: boolean; onClick?: () => void };

export function ProfileChip({ name, sub, selected, onClick }: Props) {
  return (
    <button type="button" className={selected ? `${s.chip} ${s.selected}` : s.chip} aria-pressed={!!selected} onClick={onClick}>
      <span className={s.avatar} aria-hidden="true">{initialOf(name)}</span>
      <span className={s.text}>
        <span className={s.name}>{name}</span>
        {sub ? <span className={s.rel}>{sub}</span> : null}
      </span>
      {selected ? <span className={s.check}><Icon name="check" size={18} /></span> : null}
    </button>
  );
}

export function AddProfileChip({ label, href }: { label: string; href: string }) {
  return (
    <a className={`${s.chip} ${s.add}`} href={href}>
      <span className={s.avatar} aria-hidden="true"><Icon name="plus" size={20} /></span>
      <span className={s.name}>{label}</span>
    </a>
  );
}
