// Income & expense (design/handoff IncomeTe / IncomeEn): the Ugadi year's aadayam, vyayam, rajapujyam and avamanam
// for the janma rasi (tables/yearly), a month-by-month transit strip, money to-dos and free remedies.
import { useState } from 'react';
import type { YearOutlook } from '../../engine/api';
import { buttonClass } from '../components/Button';
import { Icon } from '../components/Icon';
import { STATUS_ICON, StatusChip } from '../components/StatusChip';
import { SubHeader } from '../components/SubHeader';
import { TodoList, type TodoItem } from '../components/TodoList';
import { WhyLink, WhySheet } from '../components/WhySheet';
import { monthYear, plusDays, todayIn, yearOf } from '../dates';
import { usePlace } from '../hooks/useDay';
import { useNames, useYearOutlook } from '../hooks/useEngine';
import { buildIcs, downloadIcs } from '../ics';
import en from '../../content/en.json';
import { useName, useT, type MessageKey } from '../i18n';
import { hrefFor } from '../router';
import { useSettings } from '../store/settings';
import { PersonPicker, remedyItems, usePerson } from './OutlookShared';
import s from './Outlook.module.css';

export function IncomeScreen() {
  const t = useT();
  const name = useName();
  const names = useNames();
  const place = usePlace(useSettings((st) => st.homePlaceId));
  const [people, person, pick] = usePerson((p) => !!p.derived?.rasi);
  const date = todayIn(place.tz);
  const state = useYearOutlook(person?.derived?.rasi, date, place);
  const rasiSub = (rasi?: number) => (rasi && names ? t('inc.rasiChip', { rasi: name(names.rasisCompound[rasi - 1]!) }) : '');
  return (
    <div className={s.screen}>
      <SubHeader title={t('inc.title')} backHref={hrefFor('wishes')} />
      <main className={s.main} id="main">
        {state.status === 'ready' ? (
          <p className={s.sub} data-testid="inc-sub">{t('inc.sub', { samvatsara: name(state.data.samvatsara.name), y1: yearOf(state.data.ugadi.start), y2: yearOf(state.data.ugadi.end) })}</p>
        ) : null}
        {people.length ? <PersonPicker people={people} selected={person} onPick={pick} sub={(p) => rasiSub(p.derived?.rasi)} /> : (
          <div className={`${s.card} ${s.pad}`}>
            <p className={s.text}>{t('job.needsBirth')}</p>
            <a className={buttonClass('secondary')} href={hrefFor('family', 'new')}>{t('family.addBirth')}</a>
          </div>
        )}
        <p className={s.note}>{t('inc.source')}</p>
        {state.status === 'loading' ? <p className={s.status} role="status">{t('today.calculating')}</p> : null}
        {state.status === 'error' ? <p className={s.status} role="alert">—</p> : null}
        {state.status === 'ready' ? <Year y={state.data} date={date} /> : null}
        <p className={s.disclaimer}>{t('disclaimer.body')}</p>
      </main>
    </div>
  );
}

function Gauge({ value, max, tone, label, sub, note }: { value: number; max: number; tone: 'good' | 'mixed'; label: string; sub: string; note: string }) {
  // A half-ring: the filled part is value / max.
  const r = 44, c = Math.PI * r, f = Math.max(0, Math.min(1, value / max));
  const color = tone === 'good' ? 'var(--az-leaf)' : 'var(--az-caution)';
  return (
    <div className={`${s.card} ${s.gauge}`} data-testid="gauge">
      <svg width="120" height="70" viewBox="0 0 120 70" aria-hidden="true">
        <path d="M 16 62 A 44 44 0 0 1 104 62" fill="none" stroke="var(--az-turmeric-soft)" strokeWidth="14" strokeLinecap="butt" />
        <path d="M 16 62 A 44 44 0 0 1 104 62" fill="none" stroke={color} strokeWidth="14" strokeDasharray={`${(c * f).toFixed(1)} ${c.toFixed(1)}`} />
      </svg>
      <span className={s.gaugeNum}>{value}<small>/{max}</small></span>
      <span className={s.gaugeName}>{label}</span>
      <span className={s.note}>{sub}</span>
      <span className={s.note} style={{ color: 'var(--az-ink)' }}>{note}</span>
    </div>
  );
}

function Year({ y, date }: { y: YearOutlook; date: string }) {
  const t = useT();
  const name = useName();
  const lang = useSettings((st) => st.lang);
  const [why, setWhy] = useState(false);
  const tb = y.table;
  const pct = (v: number, max: number) => `${Math.round((v / max) * 100)}%`;
  const masaName = (m: YearOutlook['months'][number]) => (m.masa.adhika ? t('inc.adhika', { masa: name(m.masa.name) }) : name(m.masa.name));
  const ahead = y.months.slice(y.current, y.current + 4);

  // To-dos from the engine (outlook.json income.todos).
  const KEYS = new Set(Object.keys(en));
  const todos: TodoItem[] = y.todos.map(({ id }) => ({
    id, text: t(`${id}.text` as MessageKey), when: KEYS.has(`${id}.when`) ? t(`${id}.when` as MessageKey) : undefined, free: true,
  }));

  const fridayReminder = () => {
    // Next Friday from today (civil date), 18:00 local is not needed: an all-day weekly reminder.
    const dow = new Date(`${date}T00:00:00Z`).getUTCDay(); // 0 Sun … 5 Fri
    const first = plusDays(date, (5 - dow + 7) % 7);
    downloadIcs(buildIcs({ uid: `friday-saving-${first}@astroz`, title: t('inc.icsSaving'), allDay: { start: first, end: first }, rrule: 'FREQ=WEEKLY;BYDAY=FR', description: t('ics.description') }), 'astroz-friday-saving.ics');
  };

  return (
    <>
      {tb ? (
        <section className={`${s.card} ${s.bars}`} aria-label={t('inc.aadayam')} data-testid="inc-bars">
          <div className={s.barRow}>
            <div className={s.barHead}><span><b>{t('inc.aadayam')}</b><small>{t('inc.aadayamSub')}</small></span><span className={`${s.num} ${s.numIn}`} data-testid="aadayam">{tb.aadayam}</span></div>
            <div className={s.track}><div className={s.fillIn} style={{ width: pct(tb.aadayam, tb.scale.aadayam) }} /></div>
          </div>
          <div className={s.barRow}>
            <div className={s.barHead}><span><b>{t('inc.vyayam')}</b><small>{t('inc.vyayamSub')}</small></span><span className={`${s.num} ${s.numOut}`} data-testid="vyayam">{tb.vyayam}</span></div>
            <div className={s.track}><div className={s.fillOut} style={{ width: pct(tb.vyayam, tb.scale.vyayam) }} /></div>
            <div className={s.scale}><span>0</span><span>{tb.scale.vyayam}</span></div>
          </div>
          <div><StatusChip status={y.status} label={t(`inc.chip.${y.status === 'good' ? 'good' : 'mixed'}`)} /></div>
          <p className={s.text}>{t(`inc.body.${y.status === 'good' ? 'good' : 'mixed'}`)}</p>
          <WhyLink label={t('inc.whyNumbers')} onClick={() => setWhy(true)} />
        </section>
      ) : (
        <section className={s.missing} data-testid="inc-missing">
          <p className={s.text}>{t('inc.missing')}</p>
        </section>
      )}

      {tb ? (
        <div className={s.gauges}>
          <Gauge value={tb.rajapujyam} max={tb.scale.rajapujyam} tone="good" label={t('inc.rajapujyam')} sub={t('inc.rajapujyamSub')}
            note={tb.honour === 'good' ? t('inc.rajapujyamNote') : t('inc.rajapujyamLow')} />
          <Gauge value={tb.avamanam} max={tb.scale.avamanam} tone="mixed" label={t('inc.avamanam')} sub={t('inc.avamanamSub')}
            note={tb.honour === 'good' ? t('inc.avamanamNote') : t('inc.avamanamHigh')} />
        </div>
      ) : null}

      <section className={s.section} aria-labelledby="months-h">
        <div>
          <h2 className={s.h2} id="months-h">{t('inc.months')}</h2>
          <p className={s.sub}>{t('inc.monthsSub')}</p>
        </div>
        <div className={s.grid} data-testid="months">
          {y.months.map((m, i) => (
            <div key={`${m.masa.number}-${m.masa.adhika}`} data-testid="month" aria-current={i === y.current ? 'date' : undefined}
              className={[s.month, i > y.current ? s.monthFuture : '', i === y.current ? s.monthNow : ''].join(' ')}>
              <span className={s.monthName}>{masaName(m)}</span>
              <span className={m.status === 'good' ? s.mGood : s.mMixed}><Icon name={STATUS_ICON[m.status]} size={18} />{t(`status.${m.status}`)}</span>
              {i === y.current ? <span className={s.nowTag}>{t('inc.now')}</span> : null}
            </div>
          ))}
        </div>
        <div className={`${s.card} ${s.list}`}>
          {ahead.map((m) => {
            const h = (p: string) => String(m.transits.find((x) => x.planet === p)!.house);
            return (
              <div key={`${m.masa.number}-${m.masa.adhika}`} className={s.wrow} data-testid="month-detail">
                <div className={s.wHead}><span className={s.wDate}>{masaName(m)} · {monthYear(m.start, lang)}</span><StatusChip status={m.status} /></div>
                <span className={s.note}>{t('inc.monthTransits', { g: h('jupiter'), s: h('saturn'), r: h('rahu') })}</span>
              </div>
            );
          })}
          <div className={s.wFoot}><WhyLink label={t('match.why')} onClick={() => setWhy(true)} /></div>
        </div>
      </section>

      <TodoList title={t('inc.moneyTodos')} items={todos} freeLabel={t('free')} />
      <TodoList title={t('inc.remedies')} items={remedyItems(y.remedies, lang)} freeLabel={t('free')} />
      <button type="button" className={buttonClass('primary', true)} onClick={fridayReminder}><Icon name="calendar" size={20} />{t('inc.remind')}</button>

      {why ? (
        <WhySheet title={t('inc.whyNumbers')} kicker={t('why.kicker')} closeLabel={t('form.close')} method={t('inc.method')} onClose={() => setWhy(false)}
          factors={tb ? [
            { label: t('inc.aadayam'), value: `${tb.aadayam}/${tb.scale.aadayam}` },
            { label: t('inc.vyayam'), value: `${tb.vyayam}/${tb.scale.vyayam}` },
            { label: t('inc.rajapujyam'), value: `${tb.rajapujyam}/${tb.scale.rajapujyam}` },
            { label: t('inc.avamanam'), value: `${tb.avamanam}/${tb.scale.avamanam}` },
          ] : []} />
      ) : null}
    </>
  );
}
