// Future tab: the Vimshottari dasha timeline and the slow transits ahead, over a horizon the person chooses
// (3 years by month, 10 years by year, or the whole life by mahadasha — tables/future.json). Tendencies, not events.
import { useEffect, useState } from 'react';
import type { DashaSpan, FutureOutlook } from '../../engine/api';
import { buttonClass } from '../components/Button';
import { Icon } from '../components/Icon';
import { StatusChip } from '../components/StatusChip';
import { TodoList } from '../components/TodoList';
import { WhyLink, WhySheet } from '../components/WhySheet';
import { monthYear, todayIn, yearOf } from '../dates';
import { usePlace } from '../hooks/useDay';
import { useFutureOutlook, useNames } from '../hooks/useEngine';
import { useName, useT, type MessageKey } from '../i18n';
import { hrefFor } from '../router';
import { useSettings } from '../store/settings';
import { PersonPicker, remedyItems, usePerson } from './OutlookShared';
import { Screen } from './Screen';
import s from './Outlook.module.css';

const MILESTONES_FIRST = 8;

export function FutureScreen() {
  const t = useT();
  const names = useNames();
  const place = usePlace(useSettings((st) => st.homePlaceId));
  const [people, person, pick] = usePerson((p) => !!p.birth);
  const [years, setYears] = useState<number | null>(null);
  useEffect(() => { if (years === null && names) setYears(names.futureHorizons.default); }, [names, years]);
  const from = todayIn(place.tz);
  const state = useFutureOutlook(person, from, years, place);

  return (
    <Screen title="future.title" intro="future.intro">
      {people.length ? <PersonPicker people={people} selected={person} onPick={pick} /> : (
        <div className={`${s.card} ${s.pad}`}>
          <p className={s.text}>{t('job.needsBirth')}</p>
          <a className={buttonClass('secondary')} href={hrefFor('family', 'new')}>{t('family.addBirth')}</a>
        </div>
      )}
      {names ? (
        <div className={s.section}>
          <span className={s.cat} id="horizon-l">{t('future.horizon')}</span>
          <div className={s.people} role="radiogroup" aria-labelledby="horizon-l">
            {names.futureHorizons.options.map((y) => (
              <button key={y} type="button" role="radio" aria-checked={years === y} className={s.horizon} onClick={() => setYears(y)}>
                {t(`future.h.${y}` as MessageKey)}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {state.status === 'loading' ? <p className={s.status} role="status">{t('today.calculating')}</p> : null}
      {state.status === 'error' ? <p className={s.status} role="alert">—</p> : null}
      {state.status === 'ready' && person ? <Timeline f={state.data} personId={person.id} /> : null}
      <p className={s.disclaimer}>{t('disclaimer.body')}</p>
    </Screen>
  );
}

function Timeline({ f, personId }: { f: FutureOutlook; personId: string }) {
  const t = useT();
  const name = useName();
  const lang = useSettings((st) => st.lang);
  const names = useNames();
  const [why, setWhy] = useState(false);
  const [shownMs, setShownMs] = useState(MILESTONES_FIRST);
  const lord = (d: DashaSpan) => name(d.name);
  const rasi = (n: number) => (names ? name(names.rasis[n - 1]!) : String(n));
  const range = (a: string, b: string) => t('future.span', { from: monthYear(a, lang), to: monthYear(b, lang) });
  const label = f.horizon.granularity === 'month' ? 'future.byMonth' : f.horizon.granularity === 'year' ? 'future.byYear' : 'future.byMaha';
  const isNow = (p: { start: string; end: string }) => p.start <= f.horizon.from && f.horizon.from <= p.end;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <section className={s.hero} aria-labelledby="now-h" data-testid="future-now">
        <span className={s.cat} id="now-h">{t('future.nowTitle')}</span>
        <h2 className={s.heroTitle}>{t('job.antarNext', { maha: lord(f.now.mahadasha), antar: lord(f.now.antardasha) })}</h2>
        <p className={s.text}>{t('future.nowText', { maha: lord(f.now.mahadasha), antar: lord(f.now.antardasha), date: monthYear(f.now.antardasha.end.date, lang) })}</p>
        <p className={s.meaning}><Icon name="lotus" size={18} /><span>{t('dasha.lasts', { lord: lord(f.now.mahadasha), years: String(f.now.mahadasha.years), meaning: t(`dasha.meaning.${f.now.mahadasha.lord}` as MessageKey) })}</span></p>
        {f.approximate ? <p className={s.note}>{t('job.approx')}</p> : null}
        <WhyLink label={t('match.why')} onClick={() => setWhy(true)} />
      </section>

      <section className={s.section} aria-labelledby="tl-h">
        <div>
          <h2 className={s.h2} id="tl-h">{t(label as MessageKey)}</h2>
          <p className={s.sub}>{t('future.d.tapHint')}</p>
        </div>
        <div className={`${s.card} ${s.list}`} data-testid="future-periods">
          {f.periods.map((p) => {
            const current = f.horizon.granularity === 'mahadasha' ? p.start <= today && today <= p.end : isNow(p);
            const when = f.horizon.granularity === 'month' ? monthYear(p.start, lang)
              : f.horizon.granularity === 'year' ? range(p.start, p.end) : `${yearOf(p.start)} – ${yearOf(p.end)}`;
            return (
              <a key={p.start} href={hrefFor('future', personId, p.start, p.end)} className={`${s.wrow} ${s.rowLink} ${current ? s.wrowTop : ''}`} data-testid="future-period" aria-current={current ? 'true' : undefined}>
                <div className={s.wHead}>
                  <span className={s.wDate}>{when}<span className={s.chev} aria-hidden="true"><Icon name="chevron-right" size={18} /></span></span>
                  {p.status ? <StatusChip status={p.status} /> : current ? <span className={s.nowTag}>{t('job.now')}</span> : null}
                </div>
                <span>{f.horizon.granularity === 'mahadasha'
                  ? t('dasha.lasts', { lord: lord(p.mahadasha), years: String(p.mahadasha.years), meaning: t(`dasha.meaning.${p.mahadasha.lord}` as MessageKey) })
                  : p.segments.map((g) => t('job.antarRow', { maha: lord(g.mahadasha), antar: lord(g.antardasha) })).join(' → ')}</span>
                {p.transits ? (
                  <span className={s.note}>{t('inc.monthTransits', {
                    g: String(p.transits.find((x) => x.planet === 'jupiter')!.house),
                    s: String(p.transits.find((x) => x.planet === 'saturn')!.house),
                    r: String(p.transits.find((x) => x.planet === 'rahu')!.house),
                  })}</span>
                ) : null}
              </a>
            );
          })}
          <div className={s.wFoot}><WhyLink label={t('match.why')} onClick={() => setWhy(true)} /></div>
        </div>
      </section>

      {f.milestones.length ? (
        <section className={s.section} aria-labelledby="ms-h">
          <h2 className={s.h2} id="ms-h">{t('future.milestones')}</h2>
          <div className={`${s.card} ${s.list}`} data-testid="future-milestones">
            {f.milestones.slice(0, shownMs).map((m) => (
              <div key={`${m.planet}-${m.date}`} className={s.wrow} data-testid="future-milestone">
                <div className={s.wHead}><span className={s.wDate}>{monthYear(m.date, lang)}</span><StatusChip status={m.status} /></div>
                <span>{t('future.milestone', { planet: name(m.name), rasi: rasi(m.rasi), house: String(m.house) })}</span>
                {m.phase ? <span className={s.note}>{t(`gochara.saturn.${m.phase}` as MessageKey)}</span> : null}
              </div>
            ))}
          </div>
          {f.milestones.length > shownMs ? (
            <button type="button" className={buttonClass('quiet')} onClick={() => setShownMs((n) => n + MILESTONES_FIRST)} style={{ alignSelf: 'center' }}>
              <Icon name="chevron-down" size={20} />{t('future.more', { n: String(Math.min(MILESTONES_FIRST, f.milestones.length - shownMs)) })}
            </button>
          ) : null}
        </section>
      ) : null}

      <TodoList title={t('inc.remedies')} items={remedyItems(f.remedies, lang)} freeLabel={t('free')} />

      {why ? (
        <WhySheet title={t('future.title')} kicker={t('why.kicker')} closeLabel={t('form.close')} method={t('future.method')} onClose={() => setWhy(false)}
          factors={f.now.transits.map((tr) => ({ label: t('job.transitTitle', { planet: name(tr.name) }), value: t('job.transitWhere', { rasi: rasi(tr.rasi), house: String(tr.house) }), status: tr.status }))} />
      ) : null}
    </>
  );
}
