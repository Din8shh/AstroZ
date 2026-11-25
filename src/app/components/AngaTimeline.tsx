// One panchangam anga (tithi, nakshatram, yogam, karanam) across the panchangam day, sunrise to next sunrise.
// Angas change at any hour: one can end minutes after sunrise, another in the small hours before the next
// sunrise, and a day can hold three tithis or four karanas. So every anga current during the day is listed,
// each with a day-part word next to its clock time, on a bar that shares the day ribbon's sunrise→sunrise axis.
// Pure layout: names and instants come from the engine (Anga / LocalTime).
import { Fragment, type CSSProperties, type ReactNode } from 'react';
import type { Anga, LocalTime } from '../../engine/api';
import { useName, useT, type MessageKey } from '../i18n';
import { useSettings } from '../store/settings';
import { shortDate } from '../dates';
import s from './AngaTimeline.module.css';

type Props = {
  label: string;
  angas: Anga[];
  /** The panchangam date (civil date of this day's sunrise). */
  date: string;
  sunrise: LocalTime;
  sunset: LocalTime;
  nextSunrise: LocalTime;
  /** Current instant (JD UT); marks the running anga only when it falls inside this day. */
  nowJd?: number | undefined;
  last?: boolean;
};

export type DayPart = 'morning' | 'afternoon' | 'evening' | 'night' | 'predawn';

const minutes = (x: LocalTime) => Number(x.time.slice(0, 2)) * 60 + Number(x.time.slice(3, 5));

/**
 * The everyday word for when a clock time falls in the panchangam day. Times after midnight still belong
 * to this day: the first hours read as night, the rest as pre-dawn (Telugu almanacs' తెల్లవారుజాము).
 */
export function dayPart(x: LocalTime, date: string, sunset: LocalTime): DayPart {
  const m = minutes(x);
  if (x.date > date) return m < 3 * 60 ? 'night' : 'predawn';
  if (x.date < date) return 'night'; // only for the start of an anga that began the evening before
  if (m < 12 * 60) return 'morning';
  if (m < 16 * 60) return 'afternoon';
  if (m < Math.max(minutes(sunset) + 60, 18 * 60)) return 'evening';
  return 'night';
}

const PART_KEY: Record<DayPart, MessageKey> = {
  morning: 'today.part.morning',
  afternoon: 'today.part.afternoon',
  evening: 'today.part.evening',
  night: 'today.part.night',
  predawn: 'today.part.predawn',
};

/** Fills a translated template whose {start}/{end}/{time} slots take styled nodes instead of strings. */
function fill(template: string, slots: Record<string, ReactNode>): ReactNode {
  const parts = template.split(/(\{start\}|\{end\}|\{time\})/);
  return parts.map((p, i) => {
    const key = p.startsWith('{') ? p.slice(1, -1) : null;
    return <Fragment key={i}>{key && key in slots ? slots[key] : p}</Fragment>;
  });
}

export function AngaTimeline({ label, angas, date, sunrise, sunset, nextSunrise, nowJd, last }: Props) {
  const t = useT();
  const name = useName();
  const lang = useSettings((st) => st.lang);
  const from = sunrise.jdUt, to = nextSunrise.jdUt;
  const inDay = angas.filter((a) => a.end.jdUt > from && a.start.jdUt < to);
  if (!inDay.length) return null;
  const live = nowJd !== undefined && nowJd >= from && nowJd < to ? nowJd : undefined;
  const isNow = (a: Anga) => live !== undefined && live >= a.start.jdUt && live < a.end.jdUt;
  const frac = (jd: number) => Math.max(0, Math.min(1, (jd - from) / (to - from)));
  const pct = (f: number) => `${(f * 100).toFixed(3)}%`;

  const at = (x: LocalTime) => {
    const part = t(PART_KEY[dayPart(x, date, sunset)]);
    return (
      <span className={s.at}>
        {fill(t('today.at', { time: '{time}', part }), { time: <b className="az-times">{x.time.slice(0, 5)}</b> })}
      </span>
    );
  };
  const spoken = (x: LocalTime) => `${t(PART_KEY[dayPart(x, date, sunset)])} ${x.time.slice(0, 5)}${x.date !== date ? `, ${shortDate(x.date, lang)}` : ''}`;

  const when = (a: Anga): { node: ReactNode; text: string } => {
    const startsBefore = a.start.jdUt <= from;
    const endsAfter = a.end.jdUt >= to;
    if (startsBefore && endsAfter) {
      return {
        node: fill(t('today.allDay', { time: '{time}' }), { time: <span className={s.at}><b className="az-times">{a.end.time.slice(0, 5)}</b> {shortDate(a.end.date, lang)}</span> }),
        text: t('today.allDay', { time: `${a.end.time.slice(0, 5)} ${shortDate(a.end.date, lang)}` }),
      };
    }
    if (endsAfter) return { node: fill(t('today.from', { time: '{time}' }), { time: at(a.start) }), text: t('today.from', { time: spoken(a.start) }) };
    // On screen an anga shows only its end, as almanacs do: its start is the end on the row above.
    // Screen readers get the full range.
    return {
      node: fill(t('today.until', { time: '{time}' }), { time: at(a.end) }),
      text: startsBefore ? t('today.until', { time: spoken(a.end) }) : t('today.range', { start: spoken(a.start), end: spoken(a.end) }),
    };
  };

  return (
    <div className={last ? `${s.anga} ${s.last}` : s.anga} data-testid="anga">
      <span className={s.label}>{label}</span>
      <div className={s.bar} aria-hidden="true">
        {inDay.map((a, i) => {
          const l = frac(a.start.jdUt), r = frac(a.end.jdUt);
          return <span key={i} className={[s.seg, i % 2 ? s.segB : s.segA, isNow(a) && s.segNow].filter(Boolean).join(' ')} style={{ left: pct(l), width: pct(r - l), '--i': i } as CSSProperties} />;
        })}
        {live !== undefined ? <span className={s.now} style={{ left: pct(frac(live)), '--n': inDay.length } as CSSProperties} /> : null}
      </div>
      <ol className={s.list}>
        {inDay.map((a, i) => {
          const w = when(a);
          return (
            <li key={i} className={isNow(a) ? `${s.item} ${s.itemNow}` : s.item}>
              <span className={s.name}>
                {name(a.name)}
                {isNow(a) ? <span className={s.nowTag}>{t('ribbon.now')}</span> : null}
              </span>
              <span className={s.when} aria-hidden="true">{w.node}</span>
              <span className="az-sr">{w.text}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
