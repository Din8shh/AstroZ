// Reveal: rasi, nakshatra · pada, lagna (only with a known birth time) and nama nakshatra
// (design/handoff Reveal.dc.html, RevealCalculating.dc.html).
import { useEffect } from 'react';
import type { Name } from '../../engine/api';
import { buttonClass } from '../components/Button';
import { Icon } from '../components/Icon';
import { LangToggle } from '../components/LangToggle';
import { Muggulu } from '../components/Muggulu';
import { derivedFrom, useChart, useNames } from '../hooks/useEngine';
import { usePlace } from '../hooks/useDay';
import { placeName as placeNameOf } from '../places';
import { useName, useT } from '../i18n';
import { useProfiles } from '../profiles';
import { hrefFor } from '../router';
import { useSettings } from '../store/settings';
import headerStyles from '../components/AppHeader.module.css';
import s from './Family.module.css';

const LOCALE = { te: 'te-IN', en: 'en-GB' } as const;

export function RevealScreen({ id }: { id: string }) {
  const t = useT();
  const name = useName();
  const lang = useSettings((st) => st.lang);
  const profile = useProfiles((st) => st.profiles.find((p) => p.id === id));
  const save = useProfiles((st) => st.save);
  const state = useChart(profile);
  const names = useNames();
  const birthPlace = usePlace(profile?.birth?.placeId ?? '');

  // Keep the profile's stored numbers (SPEC §5 `derived`) in step with the chart.
  useEffect(() => {
    if (state.status !== 'ready' || !profile) return;
    const derived = derivedFrom(state.chart, state.nama);
    if (JSON.stringify(derived) !== JSON.stringify(profile.derived ?? {})) void save({ ...profile, derived });
  }, [state, profile, save]);

  const header = (
    <header className={headerStyles.header}>
      <span className={headerStyles.brand}>{t('app.name')}</span>
      <LangToggle />
    </header>
  );

  if (!profile) return <div>{header}</div>;

  if (state.status !== 'ready') {
    return (
      <div className={s.screen}>
        {header}
        <main className={s.calc} id="main" aria-live="polite">
          <Muggulu size={120} label={t('today.calculating')} />
          <p className={s.calcTitle}>{state.status === 'error' ? '—' : t('today.calculating')}</p>
          {profile.birth ? <p className={s.calcSub}>{t('reveal.calcSub', { city: placeNameOf(birthPlace, lang) })}</p> : null}
        </main>
      </div>
    );
  }

  const { chart, nama, placeName } = state;
  const city = placeName ? (lang === 'te' && placeName.te ? placeName.te : placeName.en) : '';
  const date = profile.birth
    ? new Intl.DateTimeFormat(LOCALE[lang], { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${profile.birth.date}T00:00:00Z`))
    : '';
  const list = (nums: number[], from: Name[] | undefined) => nums.map((n) => (from?.[n - 1] ? name(from[n - 1]!) : String(n))).join(' / ');
  const uncertainRasi = chart?.dayRange && chart.dayRange.rasis.length > 1;
  const uncertainNak = chart?.dayRange && chart.dayRange.nakshatras.length > 1;
  const namaNames = nama ? [...new Set(nama.candidates.map((c) => name(c.name)))].join(' / ') : '';

  return (
    <div className={s.screen}>
      {header}
      <main className={s.reveal} id="main">
        <div className={s.revealHead}>
          <Muggulu size={56} />
          <p className={s.revealMeta}>{[profile.name, date, city].filter(Boolean).join(' · ')}</p>
          <h1 className={s.title}>{t('reveal.title')}</h1>
        </div>
        <section className={s.frame} aria-label={t('reveal.factsLabel')}>
          <div className={s.facts}>
            {chart ? (
              <>
                <Fact label={t('reveal.rasi')} value={uncertainRasi ? list(chart.dayRange!.rasis, names?.rasis) : name(chart.moon.rasiName)} sub={t('reveal.rasiSub')} />
                <Fact
                  label={t('reveal.nakPada')}
                  value={uncertainNak ? list(chart.dayRange!.nakshatras, names?.nakshatras) : `${name(chart.moon.nakshatraName)} · ${chart.moon.pada}`}
                  sub={t('reveal.nakSub')}
                />
                {chart.lagna && profile.birth?.time ? (
                  <Fact label={t('reveal.lagna')} value={name(chart.lagna.rasiName)} sub={t('reveal.lagnaSub', { time: profile.birth.time })} testId="reveal-lagna" />
                ) : (
                  <div className={s.fact} data-testid="reveal-approx">
                    <span className={s.factLabel}>{t('reveal.lagna')}</span>
                    <span className={s.approx}><Icon name="clock" size={16} />{t('reveal.approx')}</span>
                  </div>
                )}
              </>
            ) : null}
            {nama ? (
              <Fact label={t('reveal.nama')} value={namaNames} sub={t('reveal.namaSub', { aksharam: nama.aksharam })} testId="reveal-nama" />
            ) : null}
          </div>
        </section>
        <p className={s.note}>
          <span className={s.gold}><Icon name="palm-leaf" size={20} /></span>
          {t('reveal.note')}
        </p>
      </main>
      <footer className={s.footer}>
        <a className={buttonClass('primary', true)} href={hrefFor('wishes')}>{t('reveal.cta')}</a>
        <a className={buttonClass('quiet')} href={hrefFor('family', profile.id, 'edit')}>{t('reveal.edit')}</a>
      </footer>
    </div>
  );
}

function Fact({ label, value, sub, testId }: { label: string; value: string; sub: string; testId?: string }) {
  return (
    <div className={s.fact} data-testid={testId}>
      <span className={s.factLabel}>{label}</span>
      <span className={s.factValue}>{value}</span>
      <span className={s.factLabel}>{sub}</span>
    </div>
  );
}
