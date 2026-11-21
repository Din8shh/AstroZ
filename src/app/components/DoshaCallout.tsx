import { Icon } from './Icon';
import { STATUS_ICON, StatusChip, type Status } from './StatusChip';
import { WhyLink } from './WhySheet';
import s from './DoshaCallout.module.css';

type Props = {
  title: string;
  status: Status;
  statusLabel: string;
  body: string;
  helpsTitle?: string;
  helps?: string[];
  whyLabel: string;
  onWhy: () => void;
};

export function DoshaCallout({ title, status, statusLabel, body, helpsTitle, helps, whyLabel, onWhy }: Props) {
  return (
    <section className={`${s.dosha} ${s[status]}`} data-testid="dosha">
      <div className={s.head}>
        <span className={s.icon}><Icon name={STATUS_ICON[status]} size={24} /></span>
        <span className={s.title}>{title}</span>
        <StatusChip status={status} label={statusLabel} />
      </div>
      <p className={s.body}>{body}</p>
      {helps?.length ? (
        <div className={s.helps}>
          <span className={s.helpsTitle}>{helpsTitle}</span>
          <ul>{helps.map((h, i) => <li key={i}><span className={s.check}><Icon name="check" size={18} /></span><span>{h}</span></li>)}</ul>
        </div>
      ) : null}
      <WhyLink label={whyLabel} onClick={onWhy} />
    </section>
  );
}
