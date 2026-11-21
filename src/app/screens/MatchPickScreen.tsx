// Marriage · pick two people (design/handoff MatchPick.dc.html), or type two names for a names-only match.
import { useEffect, useMemo, useState } from 'react';
import type { NamaResult } from '../../engine/api';
import { getEngine, initEngine } from '../../engine/client';
import { buttonClass } from '../components/Button';
import { Icon } from '../components/Icon';
import { AddProfileChip, initialOf, ProfileChip } from '../components/ProfileChip';
import { SubHeader } from '../components/SubHeader';
import { useNames } from '../hooks/useEngine';
import { useName, useT } from '../i18n';
import { useMatch, type Slot } from '../matchStore';
import { relationChoice, useProfiles, type Profile } from '../profiles';
import { hrefFor, navigate } from '../router';
import s from './Match.module.css';

export function MatchPickScreen() {
  const t = useT();
  const m = useMatch();
  // Select the stable array, then filter: a selector that returns a new array re-renders forever.
  const all = useProfiles((st) => st.profiles);
  const profiles = useMemo(() => all.filter((p) => p.birth), [all]);
  const bride = profiles.find((p) => p.id === m.brideId);
  const groom = profiles.find((p) => p.id === m.groomId);

  // First visit: put a woman and a man from the phone into the slots.
  useEffect(() => {
    if (!m.brideId) { const f = profiles.find((p) => p.gender === 'f'); if (f) m.assign('bride', f.id); }
    if (!m.groomId) { const g = profiles.find((p) => p.gender === 'm'); if (g) m.assign('groom', g.id); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profiles.length]);

  const tap = (p: Profile) => {
    if (p.id === m.brideId) return m.assign('bride', null);
    if (p.id === m.groomId) return m.assign('groom', null);
    const slot: Slot = !m.brideId ? 'bride' : !m.groomId ? 'groom' : p.gender === 'm' ? 'groom' : 'bride';
    m.assign(slot, p.id);
  };

  const ready = m.basis === 'chart' ? !!bride && !!groom : !!m.brideName.trim() && !!m.groomName.trim();

  return (
    <div className={s.screen}>
      <SubHeader title={t('match.title')} backHref={hrefFor('wishes')} />
      <main className={s.main} id="main">
        <div className={s.seg} role="radiogroup" aria-label={t('match.modeLabel')}>
          {(['chart', 'names'] as const).map((b) => (
            <button key={b} type="button" role="radio" aria-checked={m.basis === b} className={s.segOpt} onClick={() => m.setBasis(b)}>
              {t(b === 'chart' ? 'match.byCharts' : 'match.byNames')}
            </button>
          ))}
        </div>

        {m.basis === 'chart' ? (
          <>
            <section className={s.section} aria-labelledby="pick-h">
              <h2 className={s.h2} id="pick-h">{t('match.pickTwo')}</h2>
              <div className={`${s.card} ${s.pair}`}>
                <SlotView label={t('match.bride')} p={bride} />
                <span className={s.rings}><Icon name="rings" /></span>
                <SlotView label={t('match.groom')} p={groom} />
              </div>
            </section>
            <section className={s.section} aria-label={t('match.savedPeople')}>
              <span className={s.label}>{t('match.savedPeople')}</span>
              <div className={s.people}>
                {profiles.map((p) => (
                  <ProfileChip key={p.id} name={p.name} selected={p.id === m.brideId || p.id === m.groomId}
                    sub={t(`rel.${relationChoice(p)}`)}
                    onClick={() => tap(p)} />
                ))}
                <AddProfileChip label={t('match.addPartner')} href={hrefFor('family', 'new')} />
              </div>
            </section>
            <p className={s.note}>{t('match.timeNote')}</p>
          </>
        ) : (
          <>
            <NameField slot="bride" label={t('match.bride')} />
            <NameField slot="groom" label={t('match.groom')} />
          </>
        )}

        <button type="button" className={buttonClass('primary', true)} disabled={!ready} onClick={() => navigate('wishes', 'marriage', 'result')}>
          {t('match.cta')}
        </button>
      </main>
    </div>
  );
}

function SlotView({ label, p }: { label: string; p: Profile | undefined }) {
  const names = useNames();
  const name = useName();
  const d = p?.derived;
  const sub = d?.nakshatra && d.rasi && names ? `${name(names.nakshatras[d.nakshatra - 1]!)} · ${name(names.rasis[d.rasi - 1]!)}` : '';
  return (
    <div className={s.slot} data-testid={`slot-${label}`}>
      <span className={s.slotLabel}>{label}</span>
      <span className={p ? s.avatar : `${s.avatar} ${s.avatarEmpty}`} aria-hidden="true">{p ? initialOf(p.name) : <Icon name="plus" size={20} />}</span>
      <span className={s.slotName}>{p?.name ?? '—'}</span>
      {sub ? <span className={s.slotSub}>{sub}</span> : null}
    </div>
  );
}

/** Names-only: a name, and the nama-nakshatra candidates to choose from when the first sound is ambiguous. */
function NameField({ slot, label }: { slot: Slot; label: string }) {
  const t = useT();
  const name = useName();
  const m = useMatch();
  const value = slot === 'bride' ? m.brideName : m.groomName;
  const choice = slot === 'bride' ? m.brideChoice : m.groomChoice;
  const [nama, setNama] = useState<NamaResult | null>(null);
  useEffect(() => {
    let live = true;
    if (!value.trim()) { setNama(null); return; }
    initEngine().then(() => getEngine().namaNakshatra(value)).then((r) => { if (live) setNama(r); }).catch(() => undefined);
    return () => { live = false; };
  }, [value]);
  const id = `name-${slot}`;
  return (
    <div className={s.field}>
      <label className={s.label} htmlFor={id}>{label}</label>
      <input id={id} className={s.input} value={value} placeholder={t('form.namePlaceholder')} autoComplete="off" onChange={(e) => m.setName(slot, e.target.value)} />
      {nama && nama.candidates.length > 1 ? (
        <div className={s.choices} role="radiogroup" aria-label={t('reveal.nama')}>
          {nama.candidates.map((c, i) => (
            <button key={`${c.nakshatra}-${c.pada}`} type="button" role="radio" aria-checked={i === choice} className={s.choice} onClick={() => m.setChoice(slot, i)}>
              {name(c.name)} · {c.pada}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
