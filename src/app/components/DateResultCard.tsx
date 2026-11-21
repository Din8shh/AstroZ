// A ranked muhurtham date (design/handoff DateResultCard): rank, date, score /100, window, status, ≤3 reasons, Why + action.
import type { ReactNode } from 'react';
import { Icon } from './Icon';
import { STATUS_ICON, StatusChip, type Status } from './StatusChip';
import { WhyLink } from './WhySheet';
import s from './DateResultCard.module.css';

type Props = {
  rank?: number;
  date: string;
  sub: string;
  score: number;
  window: string;
  status: Status;
  reasons: { text: string; status: Status }[];
  whyLabel: string;
  onWhy?: () => void;
  action?: ReactNode;
  href?: string;
};

export function DateResultCard({ rank, date, sub, score, window, status, reasons, whyLabel, onWhy, action, href }: Props) {
  const head = (
    <div className={s.head}>
      {rank ? <span className={s.rank}>{rank}</span> : null}
      <span className={s.when}>
        <span className={s.day}>{date}</span>
        <span className={s.sub}>{sub}</span>
      </span>
      <span className={s.score}><b className="az-times">{score}</b><small>/100</small></span>
    </div>
  );
  return (
    <article className={`${s.card} ${s[status]}`} data-testid="date-card">
      {href ? <a className={s.link} href={href}>{head}</a> : head}
      <div className={s.window}><Icon name="clock" size={18} /><span className="az-times">{window}</span></div>
      <div className={s.chips}><StatusChip status={status} /></div>
      {reasons.length ? (
        <ul className={s.reasons}>
          {reasons.slice(0, 3).map((r, i) => (
            <li key={i} className={s[`r_${r.status}`]}><Icon name={STATUS_ICON[r.status]} size={18} /><span>{r.text}</span></li>
          ))}
        </ul>
      ) : null}
      <div className={s.foot}>
        {onWhy ? <WhyLink label={whyLabel} onClick={onWhy} /> : <span />}
        {action}
      </div>
    </article>
  );
}
