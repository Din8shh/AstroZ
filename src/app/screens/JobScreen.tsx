// Job (design/handoff JobTe / JobEn): dasha now, Guru/Shani/Rahu transits from janma rasi, best windows in the
// next 90 days, joining days, hold-off days, free to-dos. All values from engine.jobOutlook.
import { useState } from 'react';
import type { DashaSpan, JobOutlook, Name, TransitView } from '../../engine/api';
import { buttonClass } from '../components/Button';
import { Icon } from '../components/Icon';
import { STATUS_ICON, StatusChip } from '../components/StatusChip';
import { SubHeader } from '../components/SubHeader';
import { TodoList, type TodoItem } from '../components/TodoList';
import { WhyLink, WhySheet } from '../components/WhySheet';
import { dayMonth, dayRange, monthYear, plusDays, todayIn, yearOf } from '../dates';
import { usePlace } from '../hooks/useDay';
import { useJobOutlook, useNames } from '../hooks/useEngine';
import { buildIcs, downloadIcs } from '../ics';
import { useName, useT, type MessageKey } from '../i18n';
import { placeName } from '../places';
import { hrefFor } from '../router';
import { useSettings } from '../store/settings';
import { windowLabel } from './muhurthamShared';
import { PersonPicker, remedyItems, usePerson } from './OutlookShared';
import s from './Outlook.module.css';

const DAYS = 90;
const LORD_YEARS: Record<string, number> = { ketu: 7, venus: 20, sun: 6, moon: 10, mars: 7, rahu: 18, jupiter: 16, saturn: 19, mercury: 17 };

export function JobScreen() {
  const t = useT();
  const place = usePlace(useSettings((st) => st.homePlaceId));
  const [people, person, pick] = usePerson((p) => !!p.birth);
  const from = todayIn(place.tz);
  const state = useJobOutlook(person, from, DAYS, place);
  return (
    <div className={s.screen}>
      <SubHeader title={t('job.title')} backHref={hrefFor('wishes')} />
      <main className={s.main} id="main">
        {people.length ? <PersonPicker people={people} selected={person} onPick={pick} /> : (
          <div className={`${s.card} ${s.pad}`}>
            <p className={s.text}>{t('job.needsBirth')}</p>
            <a className={buttonClass('secondary')} href={hrefFor('family', 'new')}>{t('family.addBirth')}</a>
          </div>
        )}
        {state.status === 'loading' ? <p className={s.status} role="status">{t('today.calculating')}</p> : null}
        {state.status === 'error' ? <p className={s.status} role="alert">—</p> : null}
        {state.status === 'ready' && person ? <Outlook o={state.data} name={person.name} from={from} place={place} /> : null}
        <p className={s.disclaimer}>{t('disclaimer.body')}</p>
      </main>
    </div>
  );
}

type Sheet = null | 'dasha' | 'transit' | 'windows' | 'days';

function Outlook({ o, name: personName, from, place }: { o: JobOutlook; name: string; from: string; place: import('../places').Place }) {
  const t = useT();
  const name = useName();
  const lang = useSettings((st) => st.lang);
  const names = useNames();
  const [sheet, setSheet] = useState<Sheet>(null);
  const nak = names ? name(names.nakshatras[o.person.nakshatra - 1]!) : '';
  const rasiC = names ? name(names.rasisCompound[o.person.rasi - 1]!) : '';
  const rasi = (n: number) => (names ? name(names.rasis[n - 1]!) : String(n));
  const d = o.dasha;
  const lord = (x: DashaSpan) => name(x.name);

  const head = o.status === 'good' ? t('job.head.good') : d.nextMaha ? t('job.head.mixedSoon') : t('job.head.mixed');
  const body = d.nextMaha
    ? t('job.body.change', { lord: lord(d.current), next: lord(d.nextMaha), date: monthYear(d.nextMaha.start.date, lang) })
    : t('job.body.steady', { lord: lord(d.current), antar: lord(d.currentAntar), date: monthYear(d.currentAntar.end.date, lang) });

  // Mahadasha bar: two before the current one, two after.
  const ci = d.mahadashas.findIndex((m) => m.lord === d.current.lord && m.start.jdUt === d.current.start.jdUt);
  const shown = d.mahadashas.slice(Math.max(0, ci - 2), ci + 3);
  const nowJd = Date.now() / 86_400_000 + 2440587.5;
  const bar = (spans: DashaSpan[], current: DashaSpan, short: boolean) => {
    const a = spans[0]!.start.jdUt, z = spans[spans.length - 1]!.end.jdUt;
    const pct = (jd: number) => `${(((jd - a) / (z - a)) * 100).toFixed(2)}%`;
    return (
      <div className={s.bar} aria-hidden="true">
        {spans.map((x, i) => (
          <span key={i} style={{ width: pct(a + (x.end.jdUt - x.start.jdUt)) }}
            className={[s.seg, x.start.jdUt === current.start.jdUt ? s.segOn : x.end.jdUt <= current.start.jdUt ? s.segPast : ''].join(' ')}>
            {short ? name(x.short) : ''}
          </span>
        ))}
        <span className={s.marker} style={{ left: pct(Math.min(z, Math.max(a, nowJd))) }} />
      </div>
    );
  };
  const ticks = (spans: DashaSpan[], marks: string[]) => (
    <div className={s.ticks} aria-hidden="true">
      {marks.map((m, i) => {
        const a = spans[0]!.start.jdUt, z = spans[spans.length - 1]!.end.jdUt;
        const jd = i === 0 ? a : i === marks.length - 1 ? z : d.current.end.jdUt;
        return <span key={i} style={{ left: `${(((jd - a) / (z - a)) * 100).toFixed(2)}%` }}>{m}</span>;
      })}
    </div>
  );
  const ai = d.antardashas.findIndex((x) => x.start.jdUt === d.currentAntar.start.jdUt);
  const prevAntar = ai > 0 ? d.antardashas[ai - 1] : undefined;
  const range = (x: DashaSpan) => `${monthYear(x.start.date, lang)} – ${monthYear(x.end.date, lang)}`;
  const meaningLord = d.nextMaha ?? d.current;

  const todos: TodoItem[] = [
    { id: 'todo.resume', text: t('todo.resume.text', { date: dayMonth(o.windows[0]?.start ?? plusDays(from, 7), lang) }), when: t('todo.resume.when'), free: true },
    ...remedyItems(o.remedies, lang),
    { id: 'todo.joinBlessings', text: t('todo.joinBlessings.text'), free: true },
  ];

  const exportAll = () => {
    const ics = buildIcs([
      ...o.windows.map((w) => ({ uid: `job-${w.start}@astroz`, title: t('job.icsWindow'), allDay: { start: w.start, end: w.end }, description: t('ics.description') })),
      ...o.joining.map((w) => ({ uid: `join-${w.date}@astroz`, title: t('event.job.muhurtham'), start: w.start.jdUt, end: w.end.jdUt, location: placeName(place, lang), description: t('ics.description') })),
    ]);
    downloadIcs(ics, 'astroz-job.ics');
  };

  return (
    <>
      <p className={s.sub} data-testid="job-sub">{t('job.sub', { name: personName, nakshatra: nak, rasi: rasiC })}</p>

      <section className={s.hero} aria-labelledby="job-head" data-testid="job-hero">
        <StatusChip status={o.status} />
        <h2 className={s.heroTitle} id="job-head">{head}</h2>
        <p className={s.text}>{body}</p>
        {o.approximate ? <p className={s.note}>{t('job.approx')}</p> : null}
        <WhyLink label={t('match.why')} onClick={() => setSheet('dasha')} />
      </section>

      <section className={`${s.card} ${s.pad}`} aria-labelledby="dasha-h" data-testid="dashas">
        <div>
          <h2 className={s.h2} id="dasha-h">{t('job.dashas')}</h2>
          <p className={s.sub}>{t('job.dashasSub', { nakshatra: nak })}</p>
        </div>
        <span className={s.label}>{t('job.mahadasha')}</span>
        {bar(shown, d.current, true)}
        {ticks(shown, [yearOf(shown[0]!.start.date), yearOf(d.current.end.date), yearOf(shown[shown.length - 1]!.end.date)])}
        <span className={s.label}>{t('job.antarIn', { lord: lord(d.current) })}</span>
        {bar(d.antardashas, d.currentAntar, false)}
        {ticks(d.antardashas, [yearOf(d.current.start.date), yearOf(d.current.end.date)])}
        <div className={s.rows}>
          {prevAntar ? <DRow label={t('job.antarRow', { maha: lord(d.current), antar: lord(prevAntar) })} when={range(prevAntar)} /> : null}
          <DRow now label={t('job.antarRow', { maha: lord(d.current), antar: lord(d.currentAntar) })} when={range(d.currentAntar)} />
          {d.nextAntar ? (
            <DRow label={d.nextAntar.start.jdUt >= d.current.end.jdUt - 1e-6
              ? t('job.antarNext', { maha: lord(d.nextMaha ?? d.nextAntar), antar: lord(d.nextAntar) })
              : t('job.antarRow', { maha: lord(d.current), antar: lord(d.nextAntar) })} when={range(d.nextAntar)} />
          ) : null}
        </div>
        <p className={s.meaning}><Icon name="lotus" size={18} /><span>{t('dasha.lasts', { lord: lord(meaningLord), years: String(LORD_YEARS[meaningLord.lord]), meaning: t(`dasha.meaning.${meaningLord.lord}` as MessageKey) })}</span></p>
      </section>

      <section className={s.section} aria-labelledby="tr-h">
        <div>
          <h2 className={s.h2} id="tr-h">{t('job.transits')}</h2>
          <p className={s.sub}>{t('job.transitsSub', { rasi: rasiC })}</p>
        </div>
        {o.transits.map((tr) => <Transit key={tr.planet} tr={tr} rasi={rasi} onWhy={() => setSheet('transit')} />)}
      </section>

      <section className={s.section} aria-labelledby="win-h">
        <div>
          <h2 className={s.h2} id="win-h">{t('job.windows', { days: String(DAYS) })}</h2>
          <p className={s.cat}>{t('job.windowsSub')}</p>
        </div>
        <div className={`${s.card} ${s.list}`} data-testid="job-windows">
          {o.windows.length ? o.windows.map((w, i) => {
            const good = (w.reasons.find((r) => r.ruleId === 'job.transits')?.values.good as number) ?? 0;
            return (
              <div key={w.start} className={`${s.wrow} ${i === 0 ? s.wrowTop : ''}`} data-testid="job-window">
                <div className={s.wHead}><span className={s.wDate}>{dayRange(w.start, w.end, lang)}</span><StatusChip status={w.status} /></div>
                <span>{t('job.windowLabel')}</span>
                <span className={s.note}>{t('job.windowNote', { good: String(good) })}</span>
              </div>
            );
          }) : <div className={s.wrow}><span className={s.note}>{t('job.noWindows')}</span></div>}
          <div className={s.wFoot}><WhyLink label={t('job.whyTimes')} onClick={() => setSheet('windows')} /></div>
        </div>

        <p className={s.cat}>{t('job.joining')}</p>
        <div className={`${s.card} ${s.list}`} data-testid="job-joining">
          {o.joining.map((w, i) => (
            <div key={w.date} className={`${s.wrow} ${i === 0 ? s.wrowTop : ''}`} data-testid="join-day">
              <div className={s.wHead}><span className={s.wDate}>{dayMonth(w.date, lang)}, {name(w.panchanga.vara.name)}</span><StatusChip status={w.status} /></div>
              <span>{t('job.joinDay', { time: windowLabel(w) })}</span>
              <span className={s.note}>{t('job.joinSub', { vara: name(w.panchanga.vara.name), nakshatra: name(w.panchanga.nakshatra.name) })}</span>
            </div>
          ))}
          {o.holdOff.map((h) => (
            <div key={h.start} className={s.wrow} data-testid="hold-off">
              <div className={s.wHead}><span className={s.wDate}>{dayRange(h.start, h.end, lang)}</span><StatusChip status="mixed" /></div>
              <span>{t('job.holdOff')}</span>
              <span className={s.note}>{t('job.holdOffNote')}</span>
            </div>
          ))}
          <div className={s.wFoot}><WhyLink label={t('job.whyDays')} onClick={() => setSheet('days')} /></div>
        </div>
      </section>

      <TodoList title={t('match.todos')} items={todos} freeLabel={t('free')} />
      <button type="button" className={buttonClass('primary', true)} onClick={exportAll}><Icon name="calendar" size={20} />{t('job.calendar')}</button>

      {sheet ? (
        <WhySheet title={sheet === 'dasha' ? t('job.dashas') : sheet === 'transit' ? t('job.transits') : sheet === 'windows' ? t('job.whyTimes') : t('job.whyDays')}
          kicker={t('why.kicker')} closeLabel={t('form.close')} method={t('job.method')} onClose={() => setSheet(null)}
          factors={[
            { label: t('job.mahadasha'), value: `${lord(d.current)} · ${lord(d.currentAntar)}` },
            ...o.transits.map((tr) => ({ label: t('job.transitTitle', { planet: name(tr.name) }), value: t('job.transitWhere', { rasi: rasi(tr.rasi), house: String(tr.house) }), status: tr.status })),
          ]} />
      ) : null}
    </>
  );
}

function DRow({ label, when, now }: { label: string; when: string; now?: boolean }) {
  const t = useT();
  return (
    <div className={`${s.drow} ${now ? s.drowNow : ''}`} data-testid={now ? 'antar-now' : 'antar-row'}>
      <span className={s.drowName}>{label}</span>
      <span className={s.drowSide}>{now ? <span className={s.nowTag}>{t('job.now')}</span> : null}<span className="az-times">{when}</span></span>
    </div>
  );
}

function Transit({ tr, rasi, onWhy }: { tr: TransitView; rasi: (n: number) => string; onWhy: () => void }) {
  const t = useT();
  const name = useName();
  const lang = useSettings((st) => st.lang);
  const short = (n: Name) => (lang === 'te' ? Array.from(n.te ?? n.en)[0] : n.en.slice(0, 2));
  return (
    <article className={`${s.card} ${s.transit}`} data-testid="transit">
      <div className={s.tHead}>
        <span className={s.avatar} aria-hidden="true">{short(tr.name)}</span>
        <span className={s.tName}>{t('job.transitTitle', { planet: name(tr.name) })}<span className={s.tSub}>{t('job.transitWhere', { rasi: rasi(tr.rasi), house: String(tr.house) })}</span></span>
      </div>
      <div><StatusChip status={tr.status} /></div>
      <h3 className={s.h3}>{t(`gochara.${tr.planet}.${tr.status === 'good' ? 'good' : 'mixed'}` as MessageKey)}</h3>
      <p className={s.text}>{t(`gochara.${tr.planet}.${tr.status === 'good' ? 'good' : 'mixed'}.body` as MessageKey)}</p>
      {tr.phase ? <p className={s.meaning}><Icon name={STATUS_ICON.mixed} size={18} /><span>{t(`gochara.saturn.${tr.phase}` as MessageKey)}</span></p> : null}
      <div className={s.tFoot}>
        <span>{tr.until ? t('job.until', { date: monthYear(tr.until.date, lang) }) : ''}</span>
        <WhyLink label={t('match.why')} onClick={onWhy} />
      </div>
    </article>
  );
}
