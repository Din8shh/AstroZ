import { useT } from '../i18n';
import { Icon } from './Icon';
import type { IconName } from './icons';
import s from './StatusChip.module.css';

export type Status = 'good' | 'mixed' | 'avoid';

/** Status always pairs colour with an icon (design tokens: lotus / half-diya / crossed-circle). */
export const STATUS_ICON: Record<Status, IconName> = { good: 'lotus', mixed: 'half-diya', avoid: 'crossed-circle' };

export function StatusChip({ status, label, variant = 'soft' }: { status: Status; label?: string; variant?: 'soft' | 'solid' }) {
  const t = useT();
  return (
    <span className={`${s.chip} ${s[variant]} ${s[status]}`}>
      <Icon name={STATUS_ICON[status]} size={18} />
      <span>{label ?? t(`status.${status}`)}</span>
    </span>
  );
}
