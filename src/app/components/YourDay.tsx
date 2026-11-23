// "Your day" on Today: chandrabalam, tarabalam and Rahu kalam for the active person
// (design/handoff TodayTe.dc.html). Readings come from the engine; this only picks the
// segment for "now" and renders content templates.
import type { DayPeriodView, LocalTime, StrengthSegment } from '../../engine/api';
import { useDayStrength } from '../hooks/useDay';
import { useName, useT } from '../i18n';
import { activeProfile, useProfiles } from '../profiles';
import type { Place } from '../places';
import { hrefFor } from '../router';
import { AddProfileChip, ProfileChip } from './ProfileChip';
import { StatusChip } from './StatusChip';
import { Icon } from './Icon';
import { WhyLink, WhySheet } from './WhySheet';
import s from './YourDay.module.css';
import { useState } from 'react';

type Props = { date: string; place: Place; periods: DayPeriodView[]; nowJd: number };

const hm = (x: LocalTime) => x.time.slice(0, 5);

/** The segment containing now (today), else the one at sunrise. */
function current<R>(segs: StrengthSegment<R>[], nowJd: number): StrengthSegment<R> | undefined {
  return segs.find((x) => nowJd >= x.start.jdUt && nowJd < x.end.jdUt) ?? segs[0];
}

export function YourDay({ date, place, periods, nowJd }: Props) {
  const t = useT();
  const name = useName();
  const profiles = useProfiles((st) => st.profiles);
  const person = useProfiles(activeProfile);
  const setActive = useProfiles((st) => st.setActive);
  const d = person?.derived;
  const strength = useDayStrength(d?.nakshatra && d.rasi ? { nakshatra: d.nakshatra, rasi: d.rasi } : null, date, place);
  const withChart = profiles.filter((p) => p.birth);
  const [why, setWhy] = useState(false);

  const rahu = periods.find((p) => p.kind === 'rahu');
  const good = periods.find((p) => p.kind === 'abhijit');
  const last = periods.length ? periods[periods.length - 1]!.end.jdUt : 0;
  const untilNote = (seg: { end: LocalTime }) => (seg.end.jdUt < last ? ` ${t('today.until', { time: hm(seg.end) })}` : '');

  return (
    <section className={s.section} aria-labelledby="yourday-h">
      <div className={s.head}>
        <h2 className={s.h2} id="yourday-h">{t('today.yourDay')}</h2>
      </div>
      <div className={s.people}>
        {withChart.map((p) => (
          <ProfileChip key={p.id} name={p.name} selected={p.id === person?.id} onClick={() => void setActive(p.id)}
            {...(p.birth?.timeKnown ? {} : { sub: t('approx') })} />
        ))}
        {withChart.length === 0 ? <AddProfileChip label={t('family.add')} href={hrefFor('family', 'new')} /> : null}
      </div>
      {person?.birth && strength.status === 'ready' ? (
        <div className={s.card} data-testid="your-day">
          {(() => {
            const c = current(strength.strength.chandrabalam, nowJd);
            const tb = current(strength.strength.tarabalam, nowJd);
            return (
              <>
                {c ? (
                  <div className={s.row}>
                    <div className={s.rowHead}><span className={s.rowTitle}>{t('today.chandrabalam')}</span><StatusChip status={c.reading.status} /></div>
                    <p className={s.rowText}>{t('today.chandraText', { house: String(c.reading.house) })}{untilNote(c)}</p>
                  </div>
                ) : null}
                {tb ? (
                  <div className={s.row}>
                    <div className={s.rowHead}><span className={s.rowTitle}>{t('today.tarabalam')}</span><StatusChip status={tb.reading.status} /></div>
                    <p className={s.rowText}>
                      {t('today.taraText', { count: String(tb.reading.reasons[0]?.values.count ?? ''), tara: name(tb.reading.tara.name) })}{untilNote(tb)}
                    </p>
                  </div>
                ) : null}
              </>
            );
          })()}
          {rahu ? (
            <div className={s.row}>
              <div className={s.rowHead}><span className={s.rowTitle}>{name(rahu.name)}</span><StatusChip status="avoid" /></div>
              <p className={s.rowText}>{t('today.rahuText', { time: `${hm(rahu.start)} – ${hm(rahu.end)}` })}</p>
            </div>
          ) : null}
          <div className={s.foot}>
            {good ? <span>{t('today.goodWindow', { time: `${hm(good.start)} – ${hm(good.end)}` })}</span> : <span />}
            <WhyLink label={t('match.why')} onClick={() => setWhy(true)} />
          </div>
          {!person.birth.timeKnown ? (
            <div className={s.foot}><span className={s.approx}><Icon name="clock" size={16} />{t('approx')}</span></div>
          ) : null}
        </div>
      ) : null}
      {why ? <WhySheet title={t('today.yourDay')} kicker={t('why.kicker')} closeLabel={t('form.close')} method={t('today.whyYourDay')} onClose={() => setWhy(false)} /> : null}
    </section>
  );
}
