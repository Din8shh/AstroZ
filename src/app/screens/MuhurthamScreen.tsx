// Muhurtham finder (design/handoff MhFinder, MhNothing): event, range, town, people → ranked dates with three reasons each.
import { useState } from 'react';
import type { EventId, MuhurthamResult, MuhurthamWindowView } from '../../engine/api';
import { buttonClass } from '../components/Button';
import { CityPicker } from '../components/CityPicker';
import { DateResultCard } from '../components/DateResultCard';
import { Icon } from '../components/Icon';
import { SubHeader } from '../components/SubHeader';
import { WhySheet } from '../components/WhySheet';
import { daysBetween, dayMonth, longDate, plusDays, todayIn } from '../dates';
import { usePlace } from '../hooks/useDay';
import { useMuhurthamSearch } from '../hooks/useEngine';
import { useName, useT, type MessageKey } from '../i18n';
import { useMuhurtham, type RangePreset, type Search } from '../muhurthamStore';
import { useMhText } from '../muhurthamText';
import type { Place } from '../places';
import { hrefFor } from '../router';
import { useSettings } from '../store/settings';
import { afterMidnight, Choices, PeoplePicker, WindowWhy, participantsOf, useCalendarExport, useDefaultPeople, useParticipantProfiles, windowLabel } from './muhurthamShared';
import s from './Muhurtham.module.css';

export const FINDER_EVENTS: EventId[] = ['vivaham', 'gruhapravesam', 'vehicle', 'job', 'business'];
const PAGE = 3, MORE = 5;

/** The civil-date range for a preset, starting today in the town's zone. */
export function rangeOf(preset: RangePreset, tz: string, custom: { from: string; to: string }): { from: string; days: number } {
  const today = todayIn(tz);
  if (preset === 'week') return { from: today, days: 7 };
  if (preset === 'month') {
    const [y, m] = today.split('-').map(Number);
    const last = new Date(Date.UTC(y!, m!, 0)).toISOString().slice(0, 10);
    return { from: today, days: daysBetween(today, last) + 1 };
  }
  if (preset === 'custom') return { from: custom.from, days: Math.max(1, Math.min(366, daysBetween(custom.from, custom.to) + 1)) };
  return { from: today, days: 90 };
}

export function MuhurthamScreen() {
  const t = useT();
  const lang = useSettings((st) => st.lang);
  const home = usePlace(useSettings((st) => st.homePlaceId));
  const store = useMuhurtham();
  const prev = store.flow === 'finder' ? store.search : null;
  const profiles = useParticipantProfiles();
  const [event, setEvent] = useState<EventId>(prev?.event ?? 'vivaham');
  const [preset, setPreset] = useState<RangePreset>(prev?.preset ?? '90');
  const [place, setPlace] = useState<Place | null>(prev?.place ?? null);
  const [custom, setCustom] = useState(() => ({ from: prev?.from ?? todayIn(home.tz), to: prev ? plusDays(prev.from, prev.days - 1) : plusDays(todayIn(home.tz), 29) }));
  const [peopleIds, setPeopleIds] = useDefaultPeople(profiles, prev?.peopleIds);
  const [state, run] = useMuhurthamSearch();
  const town = place ?? home;
  const range = rangeOf(preset, town.tz, custom);

  const search = async (override?: Partial<Search>) => {
    const q: Search = { event, preset, from: range.from, days: range.days, place: town, peopleIds, ...override };
    const result = await run({ event: q.event, from: q.from, days: q.days, place: { lat: q.place.lat, lon: q.place.lon, tz: q.place.tz }, people: participantsOf(profiles, q.peopleIds) });
    if (result) store.setResult('finder', q, result);
  };

  const shown = store.flow === 'finder' && store.result && store.search ? { result: store.result, search: store.search } : null;
  const loading = state.status === 'loading';

  return (
    <div className={s.screen}>
      <SubHeader title={t('mh.title')} backHref={hrefFor('wishes')} />
      <main className={s.main} id="main">
        <section className={`${s.card} ${s.form}`} aria-label={t('mh.title')}>
          <div className={s.q}>
            <span className={s.qLabel}>{t('mh.what')}</span>
            <Choices label={t('mh.what')} value={event} onChange={setEvent} options={FINDER_EVENTS.map((e) => ({ id: e, text: t(`event.${e}` as MessageKey) }))} />
          </div>
          <div className={s.q}>
            <span className={s.qLabel}>{t('mh.when')}</span>
            <Choices label={t('mh.when')} value={preset} onChange={setPreset}
              options={(['90', 'week', 'month', 'custom'] as const).map((p) => ({ id: p, text: t(`mh.range.${p}`) }))} />
            {preset === 'custom' ? (
              <div className={s.range}>
                <label className={s.dateField}>{t('mh.rangeFrom')}<input className={s.dateInput} type="date" value={custom.from} onChange={(e) => e.target.value && setCustom((c) => ({ ...c, from: e.target.value }))} /></label>
                <label className={s.dateField}>{t('mh.rangeTo')}<input className={s.dateInput} type="date" value={custom.to} min={custom.from} onChange={(e) => e.target.value && setCustom((c) => ({ ...c, to: e.target.value }))} /></label>
              </div>
            ) : null}
            <p className={s.note} data-testid="range-label">{longDate(range.from, lang)} – {longDate(plusDays(range.from, range.days - 1), lang)}</p>
          </div>
          <div className={s.q}>
            <span className={s.qLabel}>{t('mh.where')}</span>
            <CityPicker place={town} onChange={setPlace} />
            <p className={s.note}>{t('mh.whereNote')}</p>
          </div>
          <div className={s.q}>
            <span className={s.qLabel}>{t('mh.who')}</span>
            <PeoplePicker profiles={profiles} ids={peopleIds} onChange={setPeopleIds} />
            {!peopleIds.length ? <p className={s.note}>{t('mh.noPeople')}</p> : null}
          </div>
          <button type="button" className={buttonClass('primary', true)} disabled={loading} onClick={() => void search()}>
            <Icon name="search" size={20} />{t('mh.cta')}
          </button>
        </section>

        {loading ? <p className={s.status} role="status">{t('today.calculating')}</p> : null}
        {state.status === 'error' ? <p className={s.status} role="alert">—</p> : null}
        {!loading && shown ? (
          <Results result={shown.result} search={shown.search} people={profiles.map((p) => ({ id: p.id, name: p.name }))}
            onSee90={() => { setPreset('90'); void search({ preset: '90', from: todayIn(town.tz), days: 90 }); }}
            onOtherDates={() => setPreset('custom')} />
        ) : null}
        <p className={s.disclaimer}>{t('disclaimer.body')}</p>
      </main>
    </div>
  );
}

function Results({ result, search, people, onSee90, onOtherDates }: { result: MuhurthamResult; search: Search; people: { id: string; name: string }[]; onSee90: () => void; onOtherDates: () => void }) {
  const t = useT();
  const [count, setCount] = useState(PAGE);
  const [why, setWhy] = useState<MuhurthamWindowView | null>(null);
  const [whyNone, setWhyNone] = useState(false);
  const exportIcs = useCalendarExport();
  const { eventFor } = useMhText();
  const ev = eventFor(search.event);

  if (!result.results.length) {
    const main = result.exclusions[0];
    const n = result.nearest ? daysBetween(plusDays(search.from, search.days - 1), result.nearest.date) : 0;
    return (
      <section className={s.section} aria-labelledby="none-h" data-testid="mh-none" data-ms={result.ms}>
        <div className={s.none}>
          <h2 className={s.noneTitle} id="none-h">{t('mh.none.title', { event: ev })}</h2>
          <p className={s.text}>{main?.ruleId === 'mh.x.tarabalam' ? t('mh.none.mh.x.tarabalam') : t('mh.none.generic', { event: ev })}</p>
          <ExclusionsLink onClick={() => setWhyNone(true)} />
        </div>
        {result.nearest ? (
          <>
            <h2 className={s.h2}>{t('mh.nearest')}</h2>
            <p className={s.sub}>{t(search.preset === 'week' ? 'mh.nearestAfterWeek' : 'mh.nearestAfter', { n: String(n) })}</p>
            <Card w={result.nearest} event={search.event} people={people} onWhy={() => setWhy(result.nearest!)} />
          </>
        ) : null}
        <div className={s.actions}>
          <button type="button" className={buttonClass('secondary', true)} onClick={onSee90}>{t('mh.see90')}</button>
          <button type="button" className={buttonClass('quiet', true)} onClick={onOtherDates}>{t('mh.otherDates')}</button>
        </div>
        {whyNone ? <ExclusionsSheet result={result} event={search.event} onClose={() => setWhyNone(false)} /> : null}
        {why ? <WindowWhy w={why} event={search.event} people={people} onClose={() => setWhy(null)} /> : null}
      </section>
    );
  }

  return (
    <section className={s.section} aria-labelledby="res-h" data-testid="mh-results" data-ms={result.ms}>
      <div>
        <h2 className={s.h2} id="res-h">{t('mh.resultsTitle', { event: ev })}</h2>
        <p className={s.sub}>{t('mh.resultsSub', { count: String(result.results.length), days: String(result.daysSearched) })}</p>
      </div>
      <div className={s.list}>
        {result.results.slice(0, count).map((w, i) => (
          <Card key={w.date} w={w} rank={i + 1} event={search.event} people={people} onWhy={() => setWhy(w)}
            action={i === 0 ? <button type="button" className={buttonClass('secondary')} onClick={() => exportIcs(w, search.event, search.place)}>{t('mh.toCalendar')}</button> : undefined} />
        ))}
      </div>
      {result.results.length > count ? (
        <button type="button" className={s.more} onClick={() => setCount((c) => c + MORE)}>
          <Icon name="chevron-down" size={20} />{t('mh.more', { n: String(Math.min(MORE, result.results.length - count)) })}
        </button>
      ) : null}
      {why ? <WindowWhy w={why} event={search.event} people={people} onClose={() => setWhy(null)} /> : null}
    </section>
  );
}

export function Card({ w, rank, event, people, onWhy, action, base = 'muhurtham' }: { w: MuhurthamWindowView; rank?: number; event: EventId; people: { id: string; name: string }[]; onWhy: () => void; action?: React.ReactNode; base?: 'muhurtham' | 'house' }) {
  const t = useT();
  const name = useName();
  const lang = useSettings((st) => st.lang);
  const { lines } = useMhText();
  return (
    <DateResultCard
      {...(rank !== undefined && { rank })}
      date={dayMonth(w.start.date, lang)}
      sub={afterMidnight(w)
        ? t('mh.panchangDay', { vara: name(w.panchanga.vara.name), date: dayMonth(w.date, lang) })
        : `${name(w.panchanga.vara.name)} · ${name(w.panchanga.paksha.name)} · ${name(w.panchanga.tithi.name)}`}
      score={w.score} window={windowLabel(w, lang)} status={w.status}
      reasons={lines(w, event, people)}
      whyLabel={t('match.why')} onWhy={onWhy} action={action}
      href={hrefFor('wishes', base, w.date)}
    />
  );
}

function ExclusionsLink({ onClick }: { onClick: () => void }) {
  const t = useT();
  return (
    <button type="button" className={buttonClass('quiet')} onClick={onClick} style={{ alignSelf: 'flex-start' }}>
      <Icon name="why" size={18} />{t('match.why')}
    </button>
  );
}

function ExclusionsSheet({ result, event, onClose }: { result: MuhurthamResult; event: EventId; onClose: () => void }) {
  const t = useT();
  const { eventFor } = useMhText();
  const label = (x: MuhurthamResult['exclusions'][number]) =>
    t(`mhx.${x.ruleId}` as MessageKey, { event: eventFor(event), planet: x.values.planet ? t(`planet.${String(x.values.planet)}` as MessageKey) : '', door: x.values.door ? t(`door.${String(x.values.door)}.lc` as MessageKey) : '' });
  return (
    <WhySheet title={t('mh.none.title', { event: eventFor(event) })} kicker={t('why.kicker')} closeLabel={t('form.close')} method={t('mhd.method')} onClose={onClose}
      factors={result.exclusions.map((x) => ({ label: label(x), value: t('mhx.days', { n: String(x.days) }), status: 'avoid' as const }))} />
  );
}
