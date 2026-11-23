// Swipe down at the top of the page to refresh — in the installed app only (iOS and Android give home-screen PWAs
// no pull-to-refresh of their own; in a browser tab the browser's gesture is left alone).
// Releasing past the threshold checks for a new version of the app and switches to it; if there is none, the page
// reloads for fresh data. Touch listeners are passive: scrolling is never blocked.
import { useEffect, useRef, useState } from 'react';
import { useT } from '../i18n';
import { checkForUpdate, isStandalone } from '../pwa';
import { Icon } from './Icon';
import s from './PullToRefresh.module.css';

const THRESHOLD = 70; // px of indicator travel needed to refresh
const MAX = 110;
const RESISTANCE = 0.5;

type Phase = 'idle' | 'pull' | 'release' | 'refreshing';

const atTop = () => (document.scrollingElement?.scrollTop ?? window.scrollY) <= 0;
const sheetOpen = () => !!document.querySelector('[role="dialog"]');

export function PullToRefresh() {
  const t = useT();
  const [enabled] = useState(isStandalone);
  const [phase, setPhase] = useState<Phase>('idle');
  const [dist, setDist] = useState(0);
  const start = useRef<number | null>(null);
  const phaseRef = useRef<Phase>('idle');
  phaseRef.current = phase;

  useEffect(() => {
    if (!enabled) return;
    document.documentElement.classList.add('az-standalone');
    const onStart = (e: TouchEvent) => {
      if (phaseRef.current === 'refreshing' || e.touches.length !== 1 || !atTop() || sheetOpen()) { start.current = null; return; }
      start.current = e.touches[0]!.clientY;
    };
    const onMove = (e: TouchEvent) => {
      if (start.current === null || phaseRef.current === 'refreshing') return;
      const dy = e.touches[0]!.clientY - start.current;
      if (dy <= 0 || !atTop()) { setDist(0); setPhase('idle'); return; }
      const d = Math.min(MAX, dy * RESISTANCE);
      setDist(d);
      setPhase(d >= THRESHOLD ? 'release' : 'pull');
    };
    const onEnd = () => {
      if (start.current === null) return;
      start.current = null;
      if (phaseRef.current !== 'release') { setDist(0); setPhase('idle'); return; }
      setPhase('refreshing');
      setDist(THRESHOLD);
      void (async () => {
        const r = await checkForUpdate().catch(() => 'none' as const);
        if (r === 'none') window.location.reload(); // no new version: reload for fresh data (served offline too)
      })();
    };
    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onEnd, { passive: true });
    window.addEventListener('touchcancel', onEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
      window.removeEventListener('touchcancel', onEnd);
    };
  }, [enabled]);

  if (!enabled || phase === 'idle') return null;
  const label = phase === 'pull' ? t('ptr.pull') : phase === 'release' ? t('ptr.release') : t('ptr.refreshing');
  return (
    <div className={s.wrap} style={{ transform: `translate(-50%, ${dist - 48}px)` }} data-testid="ptr" data-phase={phase}>
      <span className={`${s.icon} ${phase === 'refreshing' ? s.spin : ''}`} style={phase === 'refreshing' ? undefined : { transform: `rotate(${(dist / THRESHOLD) * 180}deg)` }}>
        <Icon name="chevron-down" size={20} />
      </span>
      <span className={s.label} role="status" aria-live="polite">{label}</span>
    </div>
  );
}
