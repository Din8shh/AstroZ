// Reason → copy for muhurtham windows. The engine returns rule ids + values; every sentence comes from
// src/content. Tarabalam / chandrabalam of several people are folded into one line when they agree.
import type { EventId, MuhurthamWindowView, Name, Status } from '../engine/api';
import { useNames } from './hooks/useEngine';
import { useName, useT, type MessageKey } from './i18n';

export type Line = { text: string; status: Status };
type Person = { id: string; name: string };

export function useMhText() {
  const t = useT();
  const name = useName();
  const names = useNames();
  const nak = (n: number) => (names ? name(names.nakshatras[n - 1]!) : String(n));
  const eventFor = (e: EventId) => t(`event.${e}.for` as MessageKey);

  /** Lines for a window's reasons, strongest first; `limit` = 3 on a card. */
  const lines = (w: MuhurthamWindowView, event: EventId, people: Person[], limit = 3): Line[] => {
    const who = (id: string) => people.find((p) => p.id === id)?.name ?? id;
    const out: Line[] = [];
    const seen = new Set<string>();
    const push = (key: string, l: Line) => { if (!seen.has(key)) { seen.add(key); out.push(l); } };
    const taras = w.reasons.filter((r) => r.ruleId === 'mh.tarabalam');
    const moons = w.reasons.filter((r) => r.ruleId === 'mh.chandrabalam');
    for (const r of w.reasons) {
      const v = r.values as Record<string, unknown>;
      switch (r.ruleId) {
        case 'mh.nakshatra':
          push(r.ruleId, { text: t(`mhr.nakshatra.${v.quality === 'good' ? 'good' : 'neutral'}`, { nakshatra: nak(v.nakshatra as number), event: eventFor(event) }), status: v.quality === 'good' ? 'good' : 'mixed' });
          break;
        case 'mh.tithi':
          push(r.ruleId, { text: t(`mhr.tithi.${v.quality === 'good' ? 'good' : 'neutral'}`, { tithi: name(w.panchanga.tithi.name), event: eventFor(event) }), status: v.quality === 'good' ? 'good' : 'mixed' });
          break;
        case 'mh.vara':
          push(r.ruleId, { text: t(`mhr.vara.${v.quality === 'good' ? 'good' : 'neutral'}`, { vara: name(w.panchanga.vara.name), event: eventFor(event) }), status: v.quality === 'good' ? 'good' : 'mixed' });
          break;
        case 'mh.tarabalam': {
          if (taras.every((x) => x.values.status === 'good')) push('tara', { text: t(taras.length === 2 ? 'mhr.tara.both' : 'mhr.tara.all'), status: 'good' });
          else if (v.status !== 'good') {
            const p = w.people.find((x) => x.id === v.person);
            push(`tara-${String(v.person)}`, { text: t('mhr.tara.mixed', { name: who(v.person as string), tara: p ? name(p.tara.name) : String(v.tara) }), status: 'mixed' });
          }
          break;
        }
        case 'mh.chandrabalam': {
          if (moons.every((x) => x.values.status === 'good')) push('chandra', { text: t('mhr.chandra.all'), status: 'good' });
          else if (v.status !== 'good') push(`chandra-${String(v.person)}`, { text: t('mhr.chandra.avoid', { name: who(v.person as string) }), status: 'mixed' });
          break;
        }
        case 'mh.short':
          push(r.ruleId, { text: t('mhr.short', { minutes: String(v.minutes) }), status: 'mixed' });
          break;
        case 'mh.door':
          push(r.ruleId, { text: t(v.fits ? 'mhr.door.fits' : 'mhr.door.no', { group: t(`group.${String(v.group)}` as MessageKey), door: t(`door.${String(v.door)}.lc` as MessageKey) }), status: v.fits ? 'good' : 'mixed' });
          break;
        case 'mh.preferred':
          if (v.name) push(r.ruleId, { text: t('mhr.preferred', { period: name(v.name as Name) }), status: 'good' });
          break;
        case 'mh.paksha':
          push(r.ruleId, { text: t(v.paksha === 'shukla' ? 'mhr.paksha.shukla' : 'mhr.paksha.krishna'), status: v.paksha === 'shukla' ? 'good' : 'mixed' });
          break;
        case 'mh.clear':
          push(r.ruleId, { text: t('mhr.clear'), status: 'good' });
          break;
        default:
          break; // yoga / karana are always clean in a window; shown on the detail screen instead
      }
    }
    // Engine order (strongest first); the always-true "clear of Rahu kalam" line comes last and only fills a gap.
    return out.slice(0, limit);
  };

  return { lines, eventFor, nak };
}
