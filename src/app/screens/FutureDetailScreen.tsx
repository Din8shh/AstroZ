// One Future period in detail (a year, a month, or a whole mahadasha): dasha changes down to pratyantardasha with
// dates, the slow planets and their sign changes, then month/year tiles to drill into — or, for a month, its best days
// and lunar days. Route #/future/<profile id>/<start>/<end>: a random profile id and dates only, never birth details.
import { useState } from 'react';
import type { DashaSpan, FutureDetail } from '../../engine/api';
import { buttonClass } from '../components/Button';
import { Icon } from '../components/Icon';
import { STATUS_ICON, StatusChip } from '../components/StatusChip';
import { SubHeader } from '../components/SubHeader';
import { TodoList } from '../components/TodoList';
import { WhyLink, WhySheet } from '../components/WhySheet';
import { dayMonth, longDate, monthYear, weekdayName, yearOf } from '../dates';
import { usePlace } from '../hooks/useDay';
import { useFutureDetail, useNames } from '../hooks/useEngine';
import { useName, useT, type MessageKey } from '../i18n';
import { useProfiles } from '../profiles';
import { hrefFor } from '../router';
import { useSettings } from '../store/settings';
import { remedyItems } from './OutlookShared';
import s from './Outlook.module.css';

export function periodTitle(start: string, end: string, lang: 'te' | 'en'): string {
  const days = (Date.parse(end) - Date.parse(start)) / 86_400_000 + 1;
  if (days <= 31 && start.slice(0, 7) === end.slice(0, 7)) return monthYear(start, lang);
  if (days > 400) return `${yearOf(start)} – ${yearOf(end)}`;
  return `${monthYear(start, lang)} – ${monthYear(end, lang)}`;
}

export function FutureDetailScreen({ personId, start, end }: { personId: string; start: string; end: string }) {
  const t = useT();
  const lang = useSettings((st) => st.lang);
  const place = usePlace(useSettings((st) => st.homePlaceId));
  const person = useProfiles((st) => st.profiles.find((p) => p.id === personId));
  const state = useFutureDetail(person, start, end, place);
  return (
    <div className={s.screen}>
      <SubHeader title={periodTitle(start, end, lang)} backHref={hrefFor('future')} />
      <main className={s.main} id="main">
        {!person?.birth ? <p className={s.status}>{t('future.d.missing')}</p> : null}
        {state.status === 'loading' ? <p className={s.status} role="status">{t('today.calculating')}</p> : null}
        {state.status === 'error' ? <p className={s.status} role="alert">—</p> : null}
        {state.status === 'ready' && person ? <Detail d={state.data} name={person.name} /> : null}
        <p className={s.disclaimer}>{t('disclaimer.body')}</p>
      </main>
    </div>
  );
}

function Detail({ d, name: personName }: { d: FutureDetail; name: string }) {
  const t = useT();
  const name = useName();
  const lang = useSettings((st) => st.lang);
  const names = useNames();
  const [why, setWhy] = useState(false);
  const lord = (x: DashaSpan) => name(x.name);
  const rasi = (n: number) => (names ? name(names.rasis[n - 1]!) : String(n));
  const nak = names ? name(names.nakshatras[d.person.nakshatra - 1]!) : '';
  const range = (x: DashaSpan) => t('future.d.range', { from: longDate(x.start.date, lang), to: longDate(x.end.date, lang) });

  return (
    <>
      <section className={s.hero} data-testid="future-detail">
        <span className={s.cat}>{personName} · {nak} · {rasi(d.person.rasi)}</span>
        <div><StatusChip status={d.status} /></div>
        {d.approximate ? <p className={s.note}>{t('job.approx')}</p> : null}
        <WhyLink label={t('match.why')} onClick={() => setWhy(true)} />
      </section>

      <section className={s.section} aria-labelledby="fd-dasha">
        <h2 className={s.h2} id="fd-dasha">{t('future.d.dashas')}</h2>
        {d.dashas.map((x) => (
          <article key={`${x.mahadasha.lord}-${x.antardasha.start.jdUt}`} className={`${s.card} ${s.pad}`} data-testid="fd-dasha">
            <h3 className={s.h3}>{t('job.antarRow', { maha: lord(x.mahadasha), antar: lord(x.antardasha) })}</h3>
            <span className={s.note}>{range(x.antardasha)}</span>
            <p className={s.meaning}><Icon name="lotus" size={18} /><span>{t(`dasha.meaning.${x.antardasha.lord}` as MessageKey)}</span></p>
            {x.pratyantars.length ? (
              <>
                <span className={s.label}>{t('future.d.pratyantars')}</span>
                <div className={s.rows}>
                  {x.pratyantars.map((p) => (
                    <div key={p.start.jdUt} className={s.drow} data-testid="fd-pratyantar">
                      <span className={s.drowName}>{lord(p)}</span>
                      <span className={`az-times ${s.drowSide}`}>{dayMonth(p.start.date, lang)} – {dayMonth(p.end.date, lang)}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : null}
          </article>
        ))}
      </section>

      <section className={s.section} aria-labelledby="fd-tr">
        <h2 className={s.h2} id="fd-tr">{t('future.d.transits')}</h2>
        {d.transits.map((tr) => (
          <article key={tr.planet} className={`${s.card} ${s.transit}`} data-testid="fd-transit">
            <div className={s.wHead}><span className={s.tName}>{t('job.transitTitle', { planet: name(tr.name) })}<span className={s.tSub}>{t('job.transitWhere', { rasi: rasi(tr.rasi), house: String(tr.house) })}</span></span><StatusChip status={tr.status} /></div>
            {tr.phase ? <p className={s.meaning}><Icon name={STATUS_ICON.mixed} size={18} /><span>{t(`gochara.saturn.${tr.phase}` as MessageKey)}</span></p> : null}
            {tr.changes.length ? tr.changes.map((c) => (
              <span key={c.date} className={s.text} data-testid="fd-change">{t('future.d.change', { date: longDate(c.date, lang), rasi: rasi(c.rasi), house: String(c.house) })}</span>
            )) : <span className={s.note}>{t('future.d.noChange')}</span>}
          </article>
        ))}
      </section>

      {d.periods ? (
        <section className={s.section} aria-labelledby="fd-periods">
          <div>
            <h2 className={s.h2} id="fd-periods">{t(d.kind === 'years' ? 'future.byYear' : 'future.byMonth')}</h2>
            <p className={s.sub}>{t('future.d.tapHint')}</p>
          </div>
          <div className={s.grid} data-testid="fd-periods">
            {d.periods.map((p) => (
              <a key={p.start} href={hrefFor('future', d.person.id, p.start, p.end)} className={`${s.month} ${s.monthLink}`} data-testid="fd-period">
                <span className={s.monthName}>{d.kind === 'years' ? `${yearOf(p.start)}` : monthYear(p.start, lang)}</span>
                {p.status ? <span className={p.status === 'good' ? s.mGood : s.mMixed}><Icon name={STATUS_ICON[p.status]} size={18} />{t(`status.${p.status}`)}</span> : null}
                <span className={s.note}>{lord(p.antardasha)}</span>
              </a>
            ))}
          </div>
        </section>
      ) : null}

      {d.goodDays ? (
        <section className={s.section} aria-labelledby="fd-good">
          <h2 className={s.h2} id="fd-good">{t('future.d.goodDays')}</h2>
          <div className={`${s.card} ${s.list}`}>
            {d.goodDays.length ? d.goodDays.map((g) => (
              <div key={g.date} className={s.wrow} data-testid="fd-goodday">
                <div className={s.wHead}><span className={s.wDate}>{dayMonth(g.date, lang)}, {weekdayName(g.date, lang)}</span><StatusChip status="good" /></div>
                <span className={s.note}>{t('future.d.goodDay', { tara: name(g.tara.name), house: String(g.chandraHouse) })}</span>
              </div>
            )) : <div className={s.wrow}><span className={s.note}>{t('future.d.noGoodDays')}</span></div>}
          </div>
        </section>
      ) : null}

      {d.lunarDays?.length ? (
        <section className={s.section} aria-labelledby="fd-lunar">
          <h2 className={s.h2} id="fd-lunar">{t('future.d.lunar')}</h2>
          <div className={`${s.card} ${s.list}`}>
            {d.lunarDays.map((l) => (
              <div key={l.date} className={s.wrow} data-testid="fd-lunar">
                <div className={s.wHead}><span className={s.wDate}>{dayMonth(l.date, lang)}, {weekdayName(l.date, lang)}</span><span>{name(l.name)}</span></div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <TodoList title={t('inc.remedies')} items={remedyItems(d.remedies, lang)} freeLabel={t('free')} />
      <a className={buttonClass('quiet', true)} href={hrefFor('future')}>{t('nav.future')}</a>

      {why ? (
        <WhySheet title={periodTitle(d.start, d.end, lang)} kicker={t('why.kicker')} closeLabel={t('form.close')} method={t('future.method')} onClose={() => setWhy(false)}
          factors={d.transits.map((tr) => ({ label: t('job.transitTitle', { planet: name(tr.name) }), value: t('job.transitWhere', { rasi: rasi(tr.rasi), house: String(tr.house) }), status: tr.status }))} />
      ) : null}
    </>
  );
}
