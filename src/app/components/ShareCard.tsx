// On-page preview of the share card (design/handoff ShareCard). Same inputs as the PNG: names, score, verdict.
import type { ShareCardData } from '../share';
import { formatScore } from './GunaDial';
import { StatusChip } from './StatusChip';
import s from './ShareCard.module.css';

function Thoranam() {
  const leaves = Array.from({ length: 9 }, (_, i) => {
    const t = i / 8, x = 4 + 232 * t, y = 6 + 2 * t * (1 - t) * 16, len = i % 2 ? 16 : 22, w = i % 2 ? 4.5 : 5.5;
    return <path key={i} className={s.leaf} d={`M${x.toFixed(1)} ${y.toFixed(1)}c${-w} ${len * 0.3} ${-w} ${len * 0.7} 0 ${len}c${w} ${-len * 0.3} ${w} ${-len * 0.7} 0 ${-len}z`} />;
  });
  return (
    <svg className={s.thoranam} viewBox="0 0 240 40" fill="none" aria-hidden="true">
      <path className={s.string} d="M4 6Q120 22 236 6" />{leaves}
    </svg>
  );
}

export function ShareCard({ d }: { d: ShareCardData }) {
  return (
    <figure className={s.share} data-testid="share-card">
      <Thoranam />
      <span className={s.kicker}>{d.kicker}</span>
      <span className={s.names}>{d.names.join(' & ')}</span>
      <span className={s.score}><b>{formatScore(d.score)}</b><small>/{d.max}</small></span>
      <StatusChip status={d.status} variant="solid" label={d.verdict} />
      {d.approxLabel ? <span className={s.approx}>{d.approxLabel}</span> : null}
      <figcaption className={s.foot}>
        <span className={s.brand}>AstroZ</span>
        <span>{d.foot}</span>
      </figcaption>
    </figure>
  );
}
