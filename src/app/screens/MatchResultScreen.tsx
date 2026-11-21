// Marriage result (design/handoff MatchStrong / MatchMixed / MatchNamesOnly / MatchWhySheet / MatchShare).
// Every sentence is a content template filled from the reading's reasons; the engine returns no prose.
import { useMemo, useState } from 'react';
import type { KootaResult, MatchReading } from '../../engine/api';
import { Button, buttonClass } from '../components/Button';
import { DoshaCallout } from '../components/DoshaCallout';
import { GunaDial, formatScore } from '../components/GunaDial';
import { Icon } from '../components/Icon';
import { KootaRow } from '../components/KootaRow';
import { ShareCard } from '../components/ShareCard';
import { StatusChip } from '../components/StatusChip';
import { SubHeader } from '../components/SubHeader';
import { TodoList, type TodoItem } from '../components/TodoList';
import { WhyLink, WhySheet, type Factor } from '../components/WhySheet';
import { useMatchReading, useNames } from '../hooks/useEngine';
import { useName, useT, type MessageKey } from '../i18n';
import { useMatch } from '../matchStore';
import { useProfiles } from '../profiles';
import { hrefFor } from '../router';
import { drawShareCard, shareOrSave, type ShareCardData } from '../share';
import { useSettings } from '../store/settings';
import remedies from '../../content/remedies.json';
import EN from '../../content/en.json';

/** Optional copy (a note for this koota/status, a 'when' line): present only if the key exists. */
const KEYS: Record<string, unknown> = EN;
import s from './Match.module.css';

type Sheet = { kind: 'score' } | { kind: 'koota'; k: KootaResult } | { kind: 'dosha'; id: 'rajju' | 'vedha' | 'kuja' } | { kind: 'peru' } | null;

export function MatchResultScreen() {
  const t = useT();
  const m = useMatch();
  const profiles = useProfiles((st) => st.profiles);
  const bride = profiles.find((p) => p.id === m.brideId);
  const groom = profiles.find((p) => p.id === m.groomId);
  const state = useMatchReading({ basis: m.basis, bride, groom, brideName: m.brideName, groomName: m.groomName, brideChoice: m.brideChoice, groomChoice: m.groomChoice });

  return (
    <div className={s.screen}>
      <SubHeader title={t('match.title')} backHref={hrefFor('wishes', 'marriage')} />
      {state.status === 'ready' ? (
        <Result r={state.reading} />
      ) : (
        <main className={s.main} id="main">
          <p className={s.status} role="status">{state.status === 'loading' ? t('today.calculating') : '—'}</p>
          {state.status === 'incomplete' ? <a className={buttonClass('secondary', true)} href={hrefFor('wishes', 'marriage')}>{t('match.change')}</a> : null}
        </main>
      )}
    </div>
  );
}

function Result({ r }: { r: MatchReading }) {
  const t = useT();
  const name = useName();
  const lang = useSettings((st) => st.lang);
  const names = useNames();
  const [sheet, setSheet] = useState<Sheet>(null);
  const nak = (n: number) => (names ? name(names.nakshatras[n - 1]!) : String(n));
  const rasi = (n: number) => (names ? name(names.rasis[n - 1]!) : String(n));
  const kootaName = (id: string) => (names?.kootas[id] ? name(names.kootas[id]!) : id);
  const cls = (id: unknown) => (typeof id === 'string' && names?.classes[id] ? name(names.classes[id]!) : String(id));
  const a = r.bride.name, b = r.groom.name;
  const namesBasis = r.basis === 'names';
  const band = t(`band.${r.status}`);

  const shareData: ShareCardData = {
    names: [a, b], score: r.score, max: r.max, verdict: band, status: r.status,
    approxLabel: namesBasis ? t('match.namesApprox') : undefined,
    kicker: t('share.kicker'), foot: t('share.foot'), lang,
  };

  const note = (k: KootaResult) => {
    const key = `note.${k.id}.${k.status}` as MessageKey;
    if (!(key in KEYS)) return undefined;
    const d = k.reasons[0]?.values.distance as number[] | undefined;
    return t(key, d ? { a: String(d[0]), b: String(d[1]) } : undefined);
  };

  const todos: TodoItem[] = [
    ...r.todos.map(({ id }) => ({
      id, text: t(`${id}.text` as MessageKey),
      when: (`${id}.when` in KEYS ? t(`${id}.when` as MessageKey) : undefined), free: true,
    })),
  ];
  const helps = r.remedies.map((id) => remedies.items.find((x) => x.id === id)).filter(Boolean).map((x) => (lang === 'te' ? x!.te : x!.en));

  const share = async (mode: 'share' | 'save') => {
    try { await shareOrSave(await drawShareCard(shareData), mode); } catch { /* user cancelled the share sheet */ }
  };

  return (
    <main className={s.main} id="main">
      <section className={s.couple}>
        <div className={s.coupleNames}>
          <span className={s.coupleTitle}>{a} &amp; {b}</span>
          <span className={s.coupleSub}>{nak(r.bride.nakshatra)} · {rasi(r.bride.rasi)}  &amp;  {nak(r.groom.nakshatra)} · {rasi(r.groom.rasi)}</span>
        </div>
        <a className={buttonClass('quiet')} href={hrefFor('wishes', 'marriage')}>{t('match.change')}</a>
      </section>

      {namesBasis ? (
        <div className={s.banner} role="note">
          <span className={s.bannerTitle}><Icon name="why" size={20} />{t('match.namesBanner')}</span>
          <span className={s.text}>{t('dosha.kuja.notChecked')}</span>
          <a className={buttonClass('secondary')} href={hrefFor('family', 'new')}>{t('family.addBirth')}</a>
        </div>
      ) : null}

      <section className={`${s.card} ${s.dialCard}`}>
        <GunaDial score={r.score} max={r.max} status={r.status} label={band} unit={t('match.gunas')} approxLabel={namesBasis ? t('match.namesApprox') : undefined} />
        <p className={s.summary}>{t(namesBasis ? 'match.summaryNames' : 'match.summary', { score: formatScore(r.score) })}</p>
        <WhyLink label={t('match.whyScore')} onClick={() => setSheet({ kind: 'score' })} />
      </section>

      {!namesBasis && r.peruBalam ? (
        <section className={`${s.card} ${s.peru}`} data-testid="peru">
          <div className={s.rowHead}><h2 className={s.h3}>{t('match.peru')}</h2><StatusChip status={r.peruBalam.status} /></div>
          <p className={s.text}>{t(`match.peru.${r.peruBalam.status}`, { a, b })}</p>
          <div className={s.inline}><span className={s.approx}>{t('match.peruApprox')}</span><WhyLink label={t('match.why')} onClick={() => setSheet({ kind: 'peru' })} /></div>
        </section>
      ) : null}

      <section className={s.section} aria-labelledby="kootas-h">
        <h2 className={s.h2} id="kootas-h">{t('match.kootas')}</h2>
        <div className={`${s.card} ${s.kootaList}`}>
          {r.kootas.map((k) => (
            <KootaRow key={k.id} name={kootaName(k.id)} score={k.points} max={k.max} status={k.status} statusLabel={t(`status.${k.status}`)}
              note={note(k)} whyLabel={t('match.why')} onWhy={() => setSheet({ kind: 'koota', k })} />
          ))}
        </div>
      </section>

      <section className={s.section} aria-labelledby="doshas-h">
        <div>
          <h2 className={s.h2} id="doshas-h">{t('match.doshas')}</h2>
          <p className={s.sub}>{t('match.doshasIntro')}</p>
        </div>
        {r.kuja.checked ? (
          r.kuja.status === 'good' && !(r.kuja.bride.present && r.kuja.groom.present) ? (
            <DoshaCallout title={t('dosha.kuja.title')} status="good" statusLabel={t('dosha.notPresent')} body={t('dosha.kuja.absent')} whyLabel={t('match.why')} onWhy={() => setSheet({ kind: 'dosha', id: 'kuja' })} />
          ) : r.kuja.bride.present && r.kuja.groom.present ? (
            <DoshaCallout title={t('dosha.kuja.title')} status="good" statusLabel={t('dosha.balanced')} body={t('dosha.kuja.balanced')} helpsTitle={t('dosha.helps')} helps={helps} whyLabel={t('match.why')} onWhy={() => setSheet({ kind: 'dosha', id: 'kuja' })} />
          ) : (
            (['bride', 'groom'] as const).filter((who) => r.kuja.checked && r.kuja[who].present).map((who) => {
              const side = r.kuja.checked ? r.kuja[who] : undefined;
              const house = side?.fromLagna !== undefined && [2, 4, 7, 8, 12].includes(side.fromLagna) ? side.fromLagna : side?.fromMoon;
              const person = who === 'bride' ? a : b;
              return (
                <DoshaCallout key={who} title={t('dosha.kuja.titleFor', { name: person })} status="mixed" statusLabel={t('status.mixed')}
                  body={t('dosha.kuja.present', { name: person, house: String(house) })} helpsTitle={t('dosha.helps')} helps={helps}
                  whyLabel={t('match.why')} onWhy={() => setSheet({ kind: 'dosha', id: 'kuja' })} />
              );
            })
          )
        ) : null}
        <DoshaCallout title={t('dosha.rajju.title')} status={r.rajju.status} statusLabel={r.rajju.present ? t(`status.${r.rajju.status}`) : t('dosha.notPresent')}
          body={t(r.rajju.present ? 'dosha.rajju.present' : 'dosha.rajju.absent', { a: nak(r.bride.nakshatra), b: nak(r.groom.nakshatra) })}
          whyLabel={t('match.why')} onWhy={() => setSheet({ kind: 'dosha', id: 'rajju' })} />
        <DoshaCallout title={t('dosha.vedha.title')} status={r.vedha.status} statusLabel={r.vedha.present ? t(`status.${r.vedha.status}`) : t('dosha.notPresent')}
          body={t(r.vedha.present ? 'dosha.vedha.present' : 'dosha.vedha.absent', { a: nak(r.bride.nakshatra), b: nak(r.groom.nakshatra) })}
          whyLabel={t('match.why')} onWhy={() => setSheet({ kind: 'dosha', id: 'vedha' })} />
      </section>

      <TodoList title={t('match.todos')} items={todos} freeLabel={t('free')} />

      <section className={s.section} aria-labelledby="share-h">
        <h2 className={s.h2} id="share-h">{t('match.shareTitle')}</h2>
        <div className={s.center}><ShareCard d={shareData} /></div>
        <p className={s.lockNote}><span className={s.lockIcon}><Icon name="lock" size={20} /></span>{t('match.shareNote')}</p>
        <Button variant="secondary" icon="share" block onClick={() => void share('share')}>{t('match.shareSend')}</Button>
        <Button variant="quiet" onClick={() => void share('save')}>{t('match.shareSave')}</Button>
      </section>

      <p className={s.disclaimer}>{t('disclaimer.body')}</p>

      {sheet ? <WhyFor sheet={sheet} r={r} onClose={() => setSheet(null)} nak={nak} rasi={rasi} kootaName={kootaName} cls={cls} /> : null}
    </main>
  );
}

type WhyProps = { sheet: NonNullable<Sheet>; r: MatchReading; onClose: () => void; nak: (n: number) => string; rasi: (n: number) => string; kootaName: (id: string) => string; cls: (id: unknown) => string };

function WhyFor({ sheet, r, onClose, nak, rasi, kootaName, cls }: WhyProps) {
  const t = useT();
  const lang = useSettings((st) => st.lang);
  const a = r.bride.name, b = r.groom.name;
  const common = { kicker: t('why.kicker'), closeLabel: t('form.close'), method: t('why.method'), onClose };
  const factors = useMemo<Factor[]>(() => {
    if (sheet.kind === 'score') return r.kootas.map((k) => ({ label: kootaName(k.id), value: `${k.points}/${k.max}`, status: k.status }));
    if (sheet.kind === 'peru' && r.peruBalam) return [{ label: t('match.peru'), value: `${formatScore(r.peruBalam.score)}/${r.peruBalam.max}`, status: r.peruBalam.status }];
    if (sheet.kind === 'koota') {
      const v = sheet.k.reasons[0]!.values;
      const base: Factor[] = [
        { label: t('why.nakshatraOf', { name: a }), value: nak(r.bride.nakshatra) },
        { label: t('why.nakshatraOf', { name: b }), value: nak(r.groom.nakshatra) },
        { label: t('why.rasiOf', { name: a }), value: rasi(r.bride.rasi) },
        { label: t('why.rasiOf', { name: b }), value: rasi(r.groom.rasi) },
      ];
      if (sheet.k.id === 'bhakoot') base.push({ label: t('why.distance'), value: (v.distance as number[]).join(' – '), status: sheet.k.status });
      else if (sheet.k.id === 'tara') base.push({ label: kootaName('tara'), value: `${String(v.brideToGroom)} · ${String(v.groomToBride)}`, status: sheet.k.status });
      else if (sheet.k.id === 'grahaMaitri') base.push({ label: t('why.lords'), value: `${String(v.bride)} · ${String(v.groom)}`, status: sheet.k.status });
      else base.push({ label: kootaName(sheet.k.id), value: `${cls(v.bride)} · ${cls(v.groom)}`, status: sheet.k.status });
      return base;
    }
    return [
      { label: t('why.nakshatraOf', { name: a }), value: nak(r.bride.nakshatra) },
      { label: t('why.nakshatraOf', { name: b }), value: nak(r.groom.nakshatra) },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheet, r, lang]);
  const title =
    sheet.kind === 'score' ? t('match.whyScore')
    : sheet.kind === 'peru' ? t('match.peru')
    : sheet.kind === 'koota' ? t('why.title', { koota: kootaName(sheet.k.id), points: String(sheet.k.points), max: String(sheet.k.max) })
    : t(`dosha.${sheet.id}.title`);
  const body = sheet.kind === 'koota' && sheet.k.id === 'bhakoot' ? t('why.body.bhakoot') : undefined;
  return (
    <WhySheet title={title} factors={factors} {...common}>
      {body ? <p>{body}</p> : null}
    </WhySheet>
  );
}
