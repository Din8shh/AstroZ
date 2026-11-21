// 36 petals around the guna score. Ported from design/handoff GunaDial; the band (status) comes from the engine.
import { Icon } from './Icon';
import { StatusChip, type Status } from './StatusChip';
import s from './GunaDial.module.css';

type Props = { score: number; max: number; status: Status; label: string; unit: string; approxLabel?: string | undefined; size?: number };

export const formatScore = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

export function GunaDial({ score, max, status, label, unit, approxLabel, size = 200 }: Props) {
  const n = 36, R = 44;
  const filled = Math.round((score / max) * n);
  return (
    <div className={`${s.dial} ${s[status]}`} style={{ width: size }}>
      <div className={s.ring} style={{ width: size, height: size }}>
        <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
          <circle cx={50} cy={50} r={37} className={s.inner} />
          <circle cx={50} cy={50} r={34} className={`${s.inner} ${s.inner2}`} />
          {Array.from({ length: n }, (_, i) => {
            const ang = (i / n) * Math.PI * 2 - Math.PI / 2;
            return (
              <path key={i} className={i < filled ? `${s.petal} ${s.on}` : s.petal}
                d="M0 -3.2C1.6 -1.6 1.6 1.6 0 3.2 -1.6 1.6 -1.6 -1.6 0 -3.2Z"
                transform={`translate(${(50 + R * Math.cos(ang)).toFixed(2)} ${(50 + R * Math.sin(ang)).toFixed(2)}) rotate(${((i / n) * 360).toFixed(1)})`} />
            );
          })}
        </svg>
        <div className={s.center}>
          <span className={Number.isInteger(score) ? s.score : `${s.score} ${s.decimal}`} data-testid="guna-score">
            {formatScore(score)}<small>/{max}</small>
          </span>
          <span className={s.unit}>{unit}</span>
        </div>
      </div>
      <StatusChip status={status} variant="solid" label={label} />
      {approxLabel ? <span className={s.approx}><Icon name="clock" size={16} />{approxLabel}</span> : null}
    </div>
  );
}
