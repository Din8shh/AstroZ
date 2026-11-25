// The day from sunrise to the next sunrise: good and avoid windows on two lanes, a "now" marker,
// or the same periods as a list. Ported from design/handoff DayRibbon. Pure layout: every time
// comes from the engine (DayPeriodView / LocalTime); this only maps instants onto the track.
import type { CSSProperties } from 'react';
import type { DayPeriodView, LocalTime } from '../../engine/api';
import { useT } from '../i18n';
import { useSettings } from '../store/settings';
import { Icon } from './Icon';
import { STATUS_ICON, StatusChip } from './StatusChip';
import s from './DayRibbon.module.css';

/** A day period, or a chosen muhurtham window shown alongside them (detail screen). */
export type RibbonPeriod = Omit<DayPeriodView, 'kind'> & { kind: DayPeriodView['kind'] | 'muhurtham' };

type Props = {
  sunrise: LocalTime;
  sunset: LocalTime;
  nextSunrise: LocalTime;
  periods: RibbonPeriod[];
  /** Current instant (JD UT); shown only when it falls inside this day. */
  nowJd?: number | undefined;
  /** The current clock time in the day's zone, HH:MM, for the "now" pill. */
  nowLabel?: string | undefined;
  view?: 'bar' | 'list';
};

const hm = (t: LocalTime) => t.time.slice(0, 5);
const minutesOf = (t: LocalTime) => Number(t.time.slice(0, 2)) * 60 + Number(t.time.slice(3, 5));

export function DayRibbon({ sunrise, sunset, nextSunrise, periods, nowJd, nowLabel, view = 'bar' }: Props) {
  const t = useT();
  const lang = useSettings((st) => st.lang);
  const nameOf = (p: RibbonPeriod) => (lang === 'te' && p.name.te ? p.name.te : p.name.en);
  const total = nextSunrise.jdUt - sunrise.jdUt;
  const frac = (jd: number) => Math.max(0, Math.min(1, (jd - sunrise.jdUt) / total));
  const pct = (f: number) => `${(f * 100).toFixed(3)}%`;
  const live = nowJd !== undefined && nowJd >= sunrise.jdUt && nowJd < nextSunrise.jdUt ? nowJd : undefined;
  const isNow = (p: RibbonPeriod) => live !== undefined && live >= p.start.jdUt && live < p.end.jdUt;

  if (view === 'list') {
    return (
      <ol className={`${s.list} az-stagger`}>
        {periods.map((p, i) => (
          <li key={`${p.kind}-${i}`} className={[s.row, p.status === 'good' ? s.rowGood : s.rowAvoid, isNow(p) && s.isNow].filter(Boolean).join(' ')}>
            <span className={s.rowIcon}><Icon name={STATUS_ICON[p.status]} size={20} /></span>
            <span className={s.rowName}>
              {nameOf(p)}
              {isNow(p) ? <span className={s.nowTag}>{t('ribbon.now')}</span> : null}
            </span>
            <span className={`az-times ${s.rowTime}`}>{hm(p.start)} – {hm(p.end)}</span>
            <span className="az-sr">{t(`status.${p.status}`)}</span>
          </li>
        ))}
      </ol>
    );
  }

  // Ticks: sunrise, local noon, sunset, local midnight, next sunrise (minutes past sunrise → fraction).
  const minsPastSunrise = (clockMinutes: number) => ((clockMinutes - minutesOf(sunrise) + 1440) % 1440) / (total * 1440);
  const ticks = [
    { f: 0, label: hm(sunrise) },
    { f: minsPastSunrise(12 * 60), label: '12:00' },
    { f: frac(sunset.jdUt), label: hm(sunset) },
    { f: minsPastSunrise(0), label: '00:00' },
    { f: 1, label: hm(nextSunrise) },
  ].sort((a, b) => a.f - b.f);
  const lanes = [
    { id: 'good' as const, icon: STATUS_ICON.good, cls: s.laneGood },
    { id: 'avoid' as const, icon: STATUS_ICON.avoid, cls: s.laneAvoid },
  ];
  const nightStart = frac(sunset.jdUt);

  return (
    <div className={s.ribbon}>
      <div className={s.ends}>
        <span><Icon name="sunrise" size={18} />{t('today.sunrise')} <b className="az-times">{hm(sunrise)}</b></span>
        <span><Icon name="moon" size={18} />{t('today.sunset')} <b className="az-times">{hm(sunset)}</b></span>
      </div>
      <div className={s.track} role="img" aria-label={periods.map((p) => `${nameOf(p)} ${hm(p.start)}–${hm(p.end)}`).join(', ')}>
        <div className={s.plot}>
          <span className={s.night} style={{ left: pct(nightStart), width: `calc(100% - ${pct(nightStart)})` }} />
          {lanes.map((ln) => (
            <div key={ln.id} className={`${s.lane} ${ln.cls}`}>
              <span className={s.laneIcon}><Icon name={ln.icon} size={16} /></span>
              {periods.filter((p) => p.status === ln.id).map((p, i) => {
                const a = frac(p.start.jdUt), b = frac(p.end.jdUt);
                return (
                  <span key={i} className={`${s.seg} ${ln.id === 'good' ? s.segGood : s.segAvoid}`}
                    style={{ left: pct(a), width: pct(b - a), '--i': i } as CSSProperties} title={`${nameOf(p)} ${hm(p.start)}–${hm(p.end)}`} />
                );
              })}
            </div>
          ))}
          {live !== undefined ? (
            <span className={s.now} style={{ left: pct(frac(live)) }} data-testid="ribbon-now">
              <span className={`${s.nowPill} az-times`}>{t('ribbon.now')} {nowLabel}</span>
            </span>
          ) : null}
        </div>
      </div>
      <div className={`${s.ticks} az-times`} aria-hidden="true">
        {ticks.map((k) => <span key={k.label + k.f} style={{ left: pct(k.f) }}>{k.label}</span>)}
      </div>
      <div className={s.legend}>
        {/* In order of first appearance, as in the design. */}
        {[...new Set(periods.map((p) => p.status))].map((st) => (
          <StatusChip key={st} status={st} label={t(st === 'good' ? 'ribbon.goodWindow' : 'ribbon.avoid')} />
        ))}
      </div>
    </div>
  );
}
