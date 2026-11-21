// "Why?" bottom sheet (design/handoff WhySheet): every result links to one (CLAUDE.md content rules).
import { useEffect, useRef, type ReactNode } from 'react';
import { Icon } from './Icon';
import { STATUS_ICON, type Status } from './StatusChip';
import s from './WhySheet.module.css';

export type Factor = { label: string; value: string; status?: Status };

type Props = {
  title: string;
  kicker: string;
  closeLabel: string;
  factors?: Factor[];
  method?: string;
  children?: ReactNode;
  onClose: () => void;
};

export function WhySheet({ title, kicker, closeLabel, factors, method, children, onClose }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); prev?.focus(); };
  }, [onClose]);
  return (
    <div className={s.wrap}>
      <button type="button" className={s.scrim} aria-label={closeLabel} tabIndex={-1} onClick={onClose} />
      <div className={s.sheet} role="dialog" aria-modal="true" aria-label={title}>
        <span className={s.grab} aria-hidden="true" />
        <div className={s.head}>
          <span className={s.kicker}><Icon name="why" size={18} />{kicker}</span>
          <button ref={closeRef} type="button" className={s.close} onClick={onClose} aria-label={closeLabel}><Icon name="close" size={22} /></button>
        </div>
        <h2 className={s.title}>{title}</h2>
        {children ? <div className={s.body}>{children}</div> : null}
        {factors?.length ? (
          <dl className={s.factors}>
            {factors.map((f, i) => (
              <div key={i} className={s.factor}>
                <dt>{f.label}</dt>
                <dd>{f.status ? <span className={s[f.status]}><Icon name={STATUS_ICON[f.status]} size={18} /></span> : null}<span>{f.value}</span></dd>
              </div>
            ))}
          </dl>
        ) : null}
        {method ? <p className={s.method}><span className={s.methodIcon}><Icon name="palm-leaf" size={18} /></span><span>{method}</span></p> : null}
      </div>
    </div>
  );
}

export function WhyLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" className={s.why} onClick={onClick}>
      <Icon name="why" size={18} />
      <span>{label}</span>
    </button>
  );
}
