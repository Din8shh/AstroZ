// New house · gruhapravesam (design/handoff NewHouseTe / NewHouseEn): door direction, best dates, entry direction
// by tithi, the ceremony checklist and a calendar reminder. Dates come from engine.findMuhurtham('gruhapravesam').
import { useEffect, useState } from 'react';
import type { Door, MuhurthamResult, MuhurthamWindowView } from '../../engine/api';
import { buttonClass } from '../components/Button';
import { CityPicker } from '../components/CityPicker';
import { Icon } from '../components/Icon';
import { SubHeader } from '../components/SubHeader';
import { TodoList, type TodoItem } from '../components/TodoList';
import { StatusChip } from '../components/StatusChip';
import { WhyLink } from '../components/WhySheet';
import { longDate, plusDays, shortDayMonth, todayIn } from '../dates';
import { usePlace } from '../hooks/useDay';
import { useMuhurthamSearch, useNames } from '../hooks/useEngine';
import { useName, useT, type MessageKey } from '../i18n';
import { useMuhurtham, type RangePreset, type Search } from '../muhurthamStore';
import type { Place } from '../places';
import { hrefFor } from '../router';
import { useSettings } from '../store/settings';
import { Card, rangeOf } from './MuhurthamScreen';
import { Choices, PeoplePicker, WindowWhy, participantsOf, useCalendarExport, useDefaultPeople, useParticipantProfiles, windowLabel } from './muhurthamShared';
import s from './Muhurtham.module.css';

const DOORS: Door[] = ['east', 'north', 'west', 'south'];
const PAGE = 3;

export function NewHouseScreen() {
  const t = useT();
  const lang = useSettings((st) => st.lang);
  const home = usePlace(useSettings((st) => st.homePlaceId));
  const store = useMuhurtham();
  const prev = store.flow === 'house' ? store.search : null;
  const profiles = useParticipantProfiles();
  const [door, setDoor] = useState<Door>(prev?.door ?? 'east');
  const [preset, setPreset] = useState<RangePreset>(prev?.preset ?? '90');
  const [place, setPlace] = useState<Place | null>(prev?.place ?? null);
  const [custom, setCustom] = useState(() => ({ from: prev?.from ?? todayIn(home.tz), to: prev ? plusDays(prev.from, prev.days - 1) : plusDays(todayIn(home.tz), 89) }));
  const [peopleIds, setPeopleIds] = useDefaultPeople(profiles, prev?.peopleIds);
  const [state, run] = useMuhurthamSearch();
  const town = place ?? home;
  const range = rangeOf(preset, town.tz, custom);
  const key = JSON.stringify([door, range, town.id, town.lat, peopleIds]);

  useEffect(() => {
    const q: Search = { event: 'gruhapravesam', preset, from: range.from, days: range.days, place: town, peopleIds, door };
    if (prev && JSON.stringify([prev.door, { from: prev.from, days: prev.days }, prev.place.id, prev.place.lat, prev.peopleIds]) === key && store.result) return;
    void run({ event: 'gruhapravesam', from: q.from, days: q.days, place: { lat: town.lat, lon: town.lon, tz: town.tz }, people: participantsOf(profiles, peopleIds), door })
      .then((result) => { if (result) store.setResult('house', q, result); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, profiles.length]);

  const shown = store.flow === 'house' && store.result && store.search?.door === door ? store.result : null;

  return (
    <div className={s.screen}>
      <SubHeader title={t('nh.title')} backHref={hrefFor('wishes')} />
      <main className={s.main} id="main">
        <p className={s.sub}>{t('nh.sub')}</p>
        <section className={`${s.card} ${s.form}`} aria-label={t('nh.title')}>
          <div className={s.q}>
            <span className={s.qLabel}>{t('nh.door')}</span>
            <Choices label={t('nh.door')} value={door} onChange={setDoor} options={DOORS.map((d) => ({ id: d, text: t(`door.${d}` as MessageKey) }))} />
          </div>
          <CityPicker place={town} onChange={setPlace} />
          <div className={s.q}>
            <Choices label={t('nh.range')} value={preset} onChange={setPreset} options={(['90', 'custom'] as const).map((p) => ({ id: p, text: t(`mh.range.${p}`) }))} />
            {preset === 'custom' ? (
              <div className={s.range}>
                <label className={s.dateField}>{t('mh.rangeFrom')}<input className={s.dateInput} type="date" value={custom.from} onChange={(e) => e.target.value && setCustom((c) => ({ ...c, from: e.target.value }))} /></label>
                <label className={s.dateField}>{t('mh.rangeTo')}<input className={s.dateInput} type="date" value={custom.to} min={custom.from} onChange={(e) => e.target.value && setCustom((c) => ({ ...c, to: e.target.value }))} /></label>
              </div>
            ) : null}
            <p className={s.note}>{longDate(range.from, lang)} – {longDate(plusDays(range.from, range.days - 1), lang)}</p>
          </div>
          <PeoplePicker profiles={profiles} ids={peopleIds} onChange={setPeopleIds} />
        </section>

        {state.status === 'loading' ? <p className={s.status} role="status">{t('today.calculating')}</p> : null}
        {shown && state.status !== 'loading' ? <HouseResults result={shown} door={door} place={town} people={profiles.filter((p) => peopleIds.includes(p.id)).map((p) => ({ id: p.id, name: p.name }))} /> : null}
        <p className={s.disclaimer}>{t('disclaimer.body')}</p>
      </main>
    </div>
  );
}

function HouseResults({ result, door, place, people }: { result: MuhurthamResult; door: Door; place: Place; people: { id: string; name: string }[] }) {
  const t = useT();
  const name = useName();
  const lang = useSettings((st) => st.lang);
  const names = useNames();
  const exportIcs = useCalendarExport();
  const [why, setWhy] = useState<MuhurthamWindowView | null>(null);
  const [count, setCount] = useState(PAGE);
  const guide = result.guide;
  const group = guide?.byDoor[door] ?? null;
  const doorLc = t(`door.${door}.lc` as MessageKey);
  const groupName = (g: string) => t(`group.${g}` as MessageKey);
  const list = result.results.length ? result.results : result.nearest ? [result.nearest] : [];
  const best = list[0];
  const tithiList = (g: string) => (guide?.groups[g] ?? []).map((n) => (names ? name(names.tithis[n - 1]!) : String(n))).join(', ');

  const checklist: TodoItem[] = best && guide ? guide.checklist.map((c) => ({
    id: c.id,
    text: t(`${c.id}.text` as MessageKey),
    when: c.when === 'eveBefore' ? t('checklist.diya.when', { date: shortDayMonth(plusDays(best.date, -1), lang) })
      : c.when === 'morning' ? t('checklist.thoranam.when')
      : c.when === 'window' ? windowLabel(best)
      : c.when === 'afterEntry' ? t('checklist.milk.when') : undefined,
    free: true,
  })) : [];

  return (
    <>
      <section className={s.section} aria-labelledby="best-h" data-testid="nh-results" data-ms={result.ms}>
        <div>
          <h2 className={s.h2} id="best-h">{t(result.results.length ? 'nh.best' : 'mh.nearest')}</h2>
          <p className={s.sub}>{group ? t('nh.bestSub', { door: doorLc, group: groupName(group) }) : t('nh.bestSubNone', { door: doorLc })}</p>
        </div>
        <div className={s.list}>
          {list.slice(0, count).map((w, i) => (
            <Card key={w.date} w={w} rank={i + 1} event="gruhapravesam" people={people} base="house" onWhy={() => setWhy(w)}
              action={i === 0 ? <button type="button" className={buttonClass('secondary')} onClick={() => exportIcs(w, 'gruhapravesam', place)}>{t('mh.toCalendar')}</button> : undefined} />
          ))}
        </div>
        {list.length > count ? (
          <button type="button" className={s.more} onClick={() => setCount((c) => c + 5)}><Icon name="chevron-down" size={20} />{t('mh.more', { n: String(Math.min(5, list.length - count)) })}</button>
        ) : null}
      </section>

      {best ? (
        <section className={s.section} aria-labelledby="entry-h">
          <h2 className={s.h2} id="entry-h">{t('nh.entryTitle')}</h2>
          <div className={s.entry} data-testid="entry-card">
            <div className={s.compass} aria-hidden="true">
              {(['north', 'south', 'west', 'east'] as Door[]).map((d) => (
                <span key={d} className={`${s[`c${d[0]!.toUpperCase()}`]} ${d === door ? s.cOn : ''}`}>{t(`door.${d}.short` as MessageKey)}</span>
              ))}
              <span className={s.cHouse}><Icon name="house" size={22} /></span>
            </div>
            <div className={s.entryBody}>
              <StatusChip status={best.door?.fits ? 'good' : 'mixed'} label={`${shortDayMonth(best.date, lang)} · ${name(best.panchanga.tithi.name)}`} />
              <h3 className={s.entryTitle}>{t('nh.enterThrough', { door: doorLc })}</h3>
              <p className={s.text}>{group && best.door?.fits
                ? t('nh.enterText', { tithi: name(best.panchanga.tithi.name), group: groupName(group), door: doorLc })
                : group ? t('mhr.door.no', { group: groupName(group), door: doorLc }) : t('nh.enterNoRule', { door: doorLc })}</p>
              <WhyLink label={t('match.why')} onClick={() => setWhy(best)} />
            </div>
          </div>
          <div className={`${s.card} ${s.groups}`}>
            {DOORS.map((d) => {
              const g = guide?.byDoor[d] ?? null;
              return (
                <div key={d} className={`${s.group} ${d === door ? s.groupMine : ''}`} data-testid="door-row">
                  <span className={s.groupDoor}>{t('nh.doorRow', { door: t(`door.${d}.lc` as MessageKey) })}{d === door ? <span className={s.mine}>{t('nh.yourHouse')}</span> : null}</span>
                  <span className={s.groupTithis}>
                    <span className={s.groupName}>{g ? t('nh.groupTithis', { group: groupName(g) }) : t('nh.askPurohit')}</span>
                    {g ? <span className={s.groupList}>{tithiList(g)}</span> : null}
                  </span>
                </div>
              );
            })}
          </div>
          <p className={s.riktaNote}><Icon name="half-diya" size={18} /><span>{t('nh.rikta')}</span></p>
        </section>
      ) : null}

      {best ? (
        <>
          <TodoList title={t('nh.checklist')} items={checklist} freeLabel={t('free')} />
          <button type="button" className={buttonClass('primary', true)} onClick={() => exportIcs(best, 'gruhapravesam', place, 24 * 60)}>
            <Icon name="calendar" size={20} />{t('nh.remind', { date: shortDayMonth(best.date, lang) })}
          </button>
        </>
      ) : null}
      {why ? <WindowWhy w={why} event="gruhapravesam" people={people} onClose={() => setWhy(null)} /> : null}
    </>
  );
}
