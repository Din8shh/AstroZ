// 36 petals around the guna score. Ported from design/handoff GunaDial; the band (status) comes from the engine.
import type { CSSProperties } from 'react';
import { Icon } from './Icon';
import { StatusChip, type Status } from './StatusChip';
import s from './GunaDial.module.css';

type Props = { score: number; max: number; status: Status; label: string; unit: string; approxLabel?: string | undefined; size?: number;
  /** A one-off shower of marigold petals (design brief: on a high match). Decorative; hidden under reduced motion. */
  celebrate?: boolean };

export const formatScore = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

// Marigold petals for the celebration: fixed positions, so every render (and every test) is the same.
const PETALS = Array.from({ length: 14 }, (_, i) => ({
  x: ((i * 37) % 100) - 50, // spread −50…49 % across the dial
  d: (i % 5) * 110, // start delay, ms
  r: (i * 53) % 360, // turn while falling
  s: 0.8 + ((i * 7) % 5) / 10, // size
  gold: i % 3 === 0,
}));

export function GunaDial({ score, max, status, label, unit, approxLabel, size = 200, celebrate }: Props) {
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
              <g key={i} transform={`translate(${(50 + R * Math.cos(ang)).toFixed(2)} ${(50 + R * Math.sin(ang)).toFixed(2)}) rotate(${((i / n) * 360).toFixed(1)})`}>
                {/* The <g> places the petal; CSS may scale the path itself (a CSS transform would replace the attribute). */}
                <path className={i < filled ? `${s.petal} ${s.on}` : s.petal} style={{ '--i': i } as CSSProperties}
                  d="M0 -3.2C1.6 -1.6 1.6 1.6 0 3.2 -1.6 1.6 -1.6 -1.6 0 -3.2Z" />
              </g>
            );
          })}
        </svg>
        {celebrate ? (
          <div className={s.burst} aria-hidden="true">
            {PETALS.map((p, i) => (
              <span key={i} className={p.gold ? `${s.marigold} ${s.gold}` : s.marigold}
                style={{ '--x': `${p.x}%`, '--d': `${p.d}ms`, '--r': `${p.r}deg`, '--s': p.s } as CSSProperties} />
            ))}
          </div>
        ) : null}
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
