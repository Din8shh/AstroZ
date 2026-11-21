import s from './Muggulu.module.css';

const LOOP = 'M12 1.5C16 1.5 16 8 20 8S22.5 12 22.5 12 20 16 16 16 16 22.5 12 22.5 8 16 4 16 1.5 12 1.5 12 4 8 8 8 8 1.5 12 1.5Z';
const RING = 'M8 4A4 4 0 0 1 16 4 4 4 0 0 1 20 8 4 4 0 0 1 20 16 4 4 0 0 1 16 20 4 4 0 0 1 8 20 4 4 0 0 1 4 16 4 4 0 0 1 4 8 4 4 0 0 1 8 4Z';

/** Muggulu ornament; with `label` it is a drawing loader announced as a status. */
export function Muggulu({ size = 64, label }: { size?: number; label?: string }) {
  const drawing = label !== undefined;
  return (
    <span className={drawing ? `${s.mug} ${s.drawing}` : s.mug} role={drawing ? 'status' : undefined} aria-label={label} aria-hidden={drawing ? undefined : true} style={{ width: size, height: size }}>
      <svg viewBox="0 0 24 24" width={size} height={size} fill="none">
        <path d={RING} className={s.line} pathLength={100} />
        <path d={LOOP} className={`${s.line} ${s.line2}`} pathLength={100} />
        {[4, 12, 20].flatMap((y) => [4, 12, 20].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r={0.9} className={s.dot} />))}
      </svg>
    </span>
  );
}
