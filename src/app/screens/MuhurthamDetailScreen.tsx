// Muhurtham detail (design/handoff MhDetail): the window, panchanga shuddhi row by row, each person's strength,
// the whole day's ribbon, .ics export and a text share with date and time only.
import { useState } from 'react';
import type { EventId, MuhurthamWindowView, Status } from '../../engine/api';
import { buttonClass } from '../components/Button';
import { DayRibbon, type RibbonPeriod } from '../components/DayRibbon';
import { Icon } from '../components/Icon';
import { initialOf } from '../components/ProfileChip';
import { STATUS_ICON, StatusChip } from '../components/StatusChip';
import { SubHeader } from '../components/SubHeader';
import { WhyLink } from '../components/WhySheet';
import { dayMonth, weekdayName } from '../dates';
import { useDay } from '../hooks/useDay';
import { useNames } from '../hooks/useEngine';
import { useName, useT, type MessageKey } from '../i18n';
import { useMuhurtham } from '../muhurthamStore';
import { useMhText } from '../muhurthamText';
import { placeName } from '../places';
import { useProfiles } from '../profiles';
import { hrefFor } from '../router';
import { useSettings } from '../store/settings';
import { afterMidnight, hm, useCalendarExport, WindowWhy, windowLabel } from './muhurthamShared';
import s from './Muhurtham.module.css';

export function MuhurthamDetailScreen({ date, base }: { date: string; base: 'muhurtham' | 'house' }) {
  const t = useT();
  const store = useMuhurtham();
  const owner = base === 'house' ? 'house' : 'finder';
  const w = store.flow === owner && store.result
    ? (store.result.results.find((x) => x.date === date) ?? (store.result.nearest?.date === date ? store.result.nearest : undefined))
    : undefined;
  const back = hrefFor('wishes', base);
  if (!w || !store.search) {
    return (
      <div className={s.screen}>
        <SubHeader title={t('mh.title')} backHref={back} />
        <main className={s.main} id="main">
          <p className={s.status}>{t('mhd.missing')}</p>
          <a className={buttonClass('secondary', true)} href={back}>{t('mhd.change')}</a>
        </main>
      </div>
    );
  }
  return <Detail w={w} event={store.search.event} place={store.search.place} peopleIds={store.search.peopleIds} back={back} />;
}

function Detail({ w, event, place, peopleIds, back }: { w: MuhurthamWindowView; event: EventId; place: import('../places').Place; peopleIds: string[]; back: string }) {
  const t = useT();
  const name = useName();
  const lang = useSettings((st) => st.lang);
  const names = useNames();
  const profiles = useProfiles((st) => st.profiles);
  const people = profiles.filter((p) => peopleIds.includes(p.id)).map((p) => ({ id: p.id, name: p.name, derived: p.derived }));
  const { eventFor, nak } = useMhText();
  const exportIcs = useCalendarExport();
  const [why, setWhy] = useState(false);
  const day = useDay(w.date, place);
  const ev = eventFor(event);
  const pc = w.panchanga;
  const q = (id: string): Status => (w.reasons.find((r) => r.ruleId === id)?.values.quality === 'good' ? 'good' : 'mixed');
  const lagnaName = names ? name(names.rasisCompound[w.lagna.rasi - 1]!) : name(w.lagna.name);
  const rasi = (n?: number) => (n && names ? name(names.rasis[n - 1]!) : '');

  const rows: { label: string; value: string; note: string; status?: Status }[] = [
    { label: t('today.tithi'), value: `${name(pc.paksha.name)} · ${name(pc.tithi.name)}`, status: w.reasons.some((r) => r.ruleId === 'mh.tithi') ? q('mh.tithi') : 'good',
      note: w.reasons.some((r) => r.ruleId === 'mh.tithi' && r.values.quality === 'good') ? t('mhd.tithi.good', { event: ev }) : t('mhd.tithi.neutral') },
    { label: t('mhd.vaaram'), value: name(pc.vara.name), status: q('mh.vara'), note: t(q('mh.vara') === 'good' ? 'mhr.vara.good' : 'mhr.vara.neutral', { vara: name(pc.vara.name), event: ev }) },
    { label: t('today.nakshatram'), value: name(pc.nakshatra.name), status: q('mh.nakshatra'), note: t(q('mh.nakshatra') === 'good' ? 'mhd.nakshatra.good' : 'mhd.nakshatra.neutral', { event: ev }) },
    { label: t('today.yogam'), value: name(pc.yoga.name), status: 'good', note: t('mhd.yoga') },
    { label: t('today.karanam'), value: pc.karanaBefore ? `${name(pc.karanaBefore.name)} → ${name(pc.karana.name)}` : name(pc.karana.name),
      status: pc.karanaBefore ? 'mixed' : 'good',
      note: pc.karanaBefore ? t('mhd.karana.before', { karana: name(pc.karanaBefore.name), time: hm(pc.karanaBefore.end) }) : t('mhd.karana.ok') },
    { label: t('mhd.lagna'), value: name(w.lagna.name), note: t('mhd.lagna.info') },
  ];

  const share = async () => {
    const text = t('share.mhText', { event: t(`event.${event}.muhurtham` as MessageKey), date: dayMonth(w.start.date, lang), time: windowLabel(w, lang) });
    try {
      if (navigator.share) await navigator.share({ text });
      else await navigator.clipboard.writeText(text);
    } catch { /* cancelled */ }
  };

  const ribbon: RibbonPeriod[] = day.status === 'ready'
    ? ([...day.periods, { kind: 'muhurtham', name: { en: t('mhd.goodWindow'), te: t('mhd.goodWindow') }, status: 'good', start: w.start, end: w.end, verified: true }] as RibbonPeriod[]).sort((a, b) => a.start.jdUt - b.start.jdUt)
    : [];
  const avoid = day.status === 'ready' ? day.periods.find((p) => p.kind === 'rahu') : undefined;
  const amrita = day.status === 'ready' ? day.periods.find((p) => p.kind === 'amrita') : undefined;

  return (
    <div className={s.screen}>
      <SubHeader title={`${dayMonth(w.start.date, lang)}, ${afterMidnight(w) ? weekdayName(w.start.date, lang) : name(pc.vara.name)}`} backHref={back} />
      <main className={s.main} id="main">
        {afterMidnight(w) ? <p className={s.sub} data-testid="panchang-day">{t('mh.panchangDay', { vara: name(pc.vara.name), date: dayMonth(w.date, lang) })}</p> : null}
        <p className={s.sub}>{t(`event.${event}.muhurtham` as MessageKey)}{people.length ? ` · ${people.map((p) => p.name).join(' & ')}` : ''}</p>

        <section className={s.hero} aria-labelledby="win-h" data-testid="mh-window">
          <div className={s.heroHead}>
            <span className={s.heroLabel} id="win-h">{t('mhd.window')}</span>
            <StatusChip status={w.status} variant="solid" label={`${w.score}/100 · ${t(`status.${w.status}`)}`} />
          </div>
          <span className={s.heroTime}>{windowLabel(w, lang)}</span>
          <span className={s.heroSub}>{t('mhd.lagnaOf', { lagna: lagnaName })} · {t('mhd.nakOf', { nakshatra: name(pc.nakshatra.name) })} · {name(pc.paksha.name)} {name(pc.tithi.name)}</span>
          <WhyLink label={t('mhd.whyTime')} onClick={() => setWhy(true)} />
        </section>

        <section className={s.section} aria-labelledby="sh-h">
          <div>
            <h2 className={s.h2} id="sh-h">{t('mhd.shuddhi')}</h2>
            <p className={s.sub}>{t('mhd.shuddhiSub')}</p>
          </div>
          <div className={`${s.card} ${s.rows}`}>
            {rows.map((r) => (
              <div key={r.label} className={s.row} data-testid="shuddhi-row">
                <div className={s.rowHead}>
                  <span className={s.rowTitle}>{r.label} · <b>{r.value}</b></span>
                  {r.status ? <StatusChip status={r.status} /> : null}
                </div>
                <span className={s.rowNote}>{r.note}</span>
              </div>
            ))}
            <div className={s.rowsFoot}><WhyLink label={t('match.why')} onClick={() => setWhy(true)} /></div>
          </div>
        </section>

        {w.people.length ? (
          <section className={s.section} aria-labelledby="pp-h">
            <h2 className={s.h2} id="pp-h">{t('mhd.people')}</h2>
            <div className={`${s.card} ${s.rows}`}>
              {w.people.map((p) => {
                const who = people.find((x) => x.id === p.id);
                const star = who?.derived?.nakshatra;
                return (
                  <div key={p.id} className={s.person} data-testid="person-strength">
                    <div className={s.personHead}>
                      <span className={s.avatar} aria-hidden="true">{initialOf(who?.name ?? '')}</span>
                      <span className={s.personName}>{who?.name}<span className={s.personSub}>{star ? nak(star) : ''}{who?.derived?.rasi ? ` · ${rasi(who.derived.rasi)}` : ''}</span></span>
                    </div>
                    <div className={s.rowHead}><span>{t('today.tarabalam')}</span><StatusChip status={p.taraStatus} /></div>
                    <span className={s.rowNote}>{t('mhd.taraText', { n: String(p.tara.number), star: star ? nak(star) : '', tara: name(p.tara.name) })}</span>
                    <div className={s.rowHead}><span>{t('today.chandrabalam')}</span><StatusChip status={p.chandraStatus === 'good' ? 'good' : 'mixed'} /></div>
                    <span className={s.rowNote}>{t(p.chandraStatus === 'good' ? 'mhd.chandraGood' : 'mhd.chandraWeak', { house: String(p.house) })}</span>
                  </div>
                );
              })}
              <div className={s.rowsFoot}><WhyLink label={t('match.why')} onClick={() => setWhy(true)} /></div>
            </div>
          </section>
        ) : null}

        {day.status === 'ready' ? (
          <section className={`${s.card} ${s.dayCard}`} aria-labelledby="wd-h">
            <div>
              <h2 className={s.h2} id="wd-h">{t('mhd.wholeDay')}</h2>
              <p className={s.sub}>{t('mhd.daySub', { city: placeName(place, lang), sunrise: hm(day.panchangam.sunrise), sunset: hm(day.panchangam.sunset) })}</p>
            </div>
            <DayRibbon sunrise={day.panchangam.sunrise} sunset={day.panchangam.sunset} nextSunrise={day.panchangam.nextSunrise} periods={ribbon} />
            <div className={s.pair}>
              <div className={`${s.tile} ${s.tileGood}`}>
                <span className={s.tileHead}><Icon name={STATUS_ICON.good} size={18} />{t('mhd.goodWindow')}</span>
                <span className={`az-times ${s.tileTime}`}>{windowLabel(w, lang)}</span>
                {amrita ? <span className={s.tileNote}>{name(amrita.name)} {hm(amrita.start)} – {hm(amrita.end)}</span> : null}
              </div>
              {avoid ? (
                <div className={`${s.tile} ${s.tileAvoid}`}>
                  <span className={s.tileHead}><Icon name={STATUS_ICON.avoid} size={18} />{t('mhd.avoid')}</span>
                  <span className={`az-times ${s.tileTime}`}>{hm(avoid.start)} – {hm(avoid.end)}</span>
                  <span className={s.tileNote}>{name(avoid.name)}</span>
                </div>
              ) : null}
            </div>
            <span className={s.listHead}>{t('today.asList')}</span>
            <DayRibbon view="list" sunrise={day.panchangam.sunrise} sunset={day.panchangam.sunset} nextSunrise={day.panchangam.nextSunrise} periods={ribbon} />
            <WhyLink label={t('mhd.whyTimes')} onClick={() => setWhy(true)} />
          </section>
        ) : <p className={s.status} role="status">{t('today.calculating')}</p>}

        <div className={s.actions}>
          <button type="button" className={buttonClass('primary', true)} onClick={() => exportIcs(w, event, place)}><Icon name="calendar" size={20} />{t('mhd.addCalendar')}</button>
          <button type="button" className={buttonClass('quiet', true)} onClick={() => void share()}><Icon name="share" size={20} />{t('mhd.sendElders')}</button>
          <p className={s.sendNote}>{t('mhd.sendNote')}</p>
        </div>
        <p className={s.disclaimer}>{t('disclaimer.body')}</p>
        {why ? <WindowWhy w={w} event={event} people={people} onClose={() => setWhy(false)} /> : null}
      </main>
    </div>
  );
}
