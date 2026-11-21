import { Icon } from './Icon';
import { STATUS_ICON, type Status } from './StatusChip';
import { WhyLink } from './WhySheet';
import s from './KootaRow.module.css';

type Props = { name: string; score: number; max: number; status: Status; statusLabel: string; note?: string | undefined; onWhy?: () => void; whyLabel: string };

export function KootaRow({ name, score, max, status, statusLabel, note, onWhy, whyLabel }: Props) {
  return (
    <div className={`${s.row} ${s[status]}`} data-testid="koota-row">
      <span className={s.icon}><Icon name={STATUS_ICON[status]} size={20} title={statusLabel} /></span>
      <span className={s.main}>
        <span className={s.name}>{name}</span>
        {note ? <span className={s.note}>{note}</span> : null}
        <span className={s.pips} aria-hidden="true">
          {Array.from({ length: max }, (_, i) => (
            <i key={i} className={[s.pip, i < Math.floor(score) && s.on, i === Math.floor(score) && score % 1 ? s.half : ''].filter(Boolean).join(' ')} />
          ))}
        </span>
      </span>
      <span className={s.side}>
        <span className={`az-times ${s.score}`}>{score}/{max}</span>
        {onWhy ? <WhyLink label={whyLabel} onClick={onWhy} /> : null}
      </span>
    </div>
  );
}
