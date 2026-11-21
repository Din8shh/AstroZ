// Pieces shared by the muhurtham finder, its detail screen and New house.
import { useEffect, useMemo, useState } from 'react';
import type { EventId, MuhurthamWindowView, Participant } from '../../engine/api';
import { AddProfileChip, ProfileChip } from '../components/ProfileChip';
import { WhySheet, type Factor } from '../components/WhySheet';
import { buildIcs, downloadIcs } from '../ics';
import { useName, useT, type MessageKey } from '../i18n';
import { useMhText } from '../muhurthamText';
import { placeName, type Place } from '../places';
import { relationChoice, useProfiles, type Profile } from '../profiles';
import { hrefFor } from '../router';
import { useSettings } from '../store/settings';
import { dayMonth } from '../dates';
import s from './Muhurtham.module.css';

export const hm = (x: { time: string }) => x.time.slice(0, 5);
export const windowLabel = (w: MuhurthamWindowView) => `${hm(w.start)} – ${hm(w.end)}`;

/** Saved people who have a birth star (needed for tarabalam / chandrabalam). */
export function useParticipantProfiles(): Profile[] {
  const all = useProfiles((st) => st.profiles);
  return useMemo(() => all.filter((p) => p.derived?.nakshatra && p.derived.rasi), [all]);
}

export function participantsOf(profiles: Profile[], ids: string[]): Participant[] {
  return profiles.filter((p) => ids.includes(p.id)).map((p) => ({ id: p.id, nakshatra: p.derived!.nakshatra!, rasi: p.derived!.rasi! }));
}

/** Default people: self and spouse when saved, else the first person. */
export function useDefaultPeople(profiles: Profile[], initial: string[] | undefined): [string[], (ids: string[]) => void] {
  const [ids, setIds] = useState<string[]>(initial ?? []);
  useEffect(() => {
    if (initial || ids.length || !profiles.length) return;
    const pick = profiles.filter((p) => p.relation === 'self' || p.relation === 'spouse').map((p) => p.id);
    setIds(pick.length ? pick : [profiles[0]!.id]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profiles.length]);
  return [ids, setIds];
}

export function PeoplePicker({ profiles, ids, onChange }: { profiles: Profile[]; ids: string[]; onChange: (ids: string[]) => void }) {
  const t = useT();
  return (
    <div className={s.people}>
      {profiles.map((p) => (
        <ProfileChip key={p.id} name={p.name} sub={t(`rel.${relationChoice(p)}`)} selected={ids.includes(p.id)}
          onClick={() => onChange(ids.includes(p.id) ? ids.filter((x) => x !== p.id) : [...ids, p.id])} />
      ))}
      <AddProfileChip label={t('mh.addPerson')} href={hrefFor('family', 'new')} />
    </div>
  );
}

/** The single-select chip row used for event, range and door. */
export function Choices<T extends string>({ label, options, value, onChange }: { label: string; options: { id: T; text: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className={s.choices} role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.id} type="button" role="radio" aria-checked={o.id === value} className={s.choice} onClick={() => onChange(o.id)}>
          {o.id === value ? <CheckMark /> : null}{o.text}
        </button>
      ))}
    </div>
  );
}
const CheckMark = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
);

/** The Why sheet for one window: the five angas with their status, each person's strength, and the method. */
export function WindowWhy({ w, event, people, onClose }: { w: MuhurthamWindowView; event: EventId; people: { id: string; name: string }[]; onClose: () => void }) {
  const t = useT();
  const name = useName();
  const { lines } = useMhText();
  const lang = useSettings((st) => st.lang);
  const quality = (id: string) => (w.reasons.find((r) => r.ruleId === id)?.values.quality === 'good' ? 'good' : 'mixed');
  const factors: Factor[] = [
    { label: t('today.tithi'), value: `${name(w.panchanga.paksha.name)} · ${name(w.panchanga.tithi.name)}`, status: w.reasons.some((r) => r.ruleId === 'mh.tithi') ? quality('mh.tithi') : 'good' },
    { label: t('today.nakshatram'), value: name(w.panchanga.nakshatra.name), status: quality('mh.nakshatra') },
    { label: t('mhd.vaaram'), value: name(w.panchanga.vara.name), status: quality('mh.vara') },
    { label: t('today.yogam'), value: name(w.panchanga.yoga.name), status: 'good' },
    { label: t('today.karanam'), value: name(w.panchanga.karana.name), status: 'good' },
    ...w.people.map((p): Factor => {
      const who = people.find((x) => x.id === p.id)?.name ?? '';
      return { label: who, value: `${t('today.tarabalam')}: ${name(p.tara.name)} · ${t('today.chandrabalam')}: ${p.house}`, status: p.taraStatus === 'good' && p.chandraStatus === 'good' ? 'good' : 'mixed' };
    }),
  ];
  return (
    <WhySheet title={`${dayMonth(w.date, lang)} · ${windowLabel(w)}`} kicker={t('why.kicker')} closeLabel={t('form.close')} factors={factors} method={t('mhd.method')} onClose={onClose}>
      <ul className={s.whyLines}>
        {lines(w, event, people, 6).map((l, i) => <li key={i}>{l.text}</li>)}
      </ul>
    </WhySheet>
  );
}

/** .ics for a window: event name + town; never names or birth details. */
export function useCalendarExport() {
  const t = useT();
  const lang = useSettings((st) => st.lang);
  return (w: MuhurthamWindowView, event: EventId, place: Place, alarmMinutes?: number) => {
    const ics = buildIcs({
      uid: `${w.start.jdUt.toFixed(5)}-${event}@astroz`,
      title: t(`event.${event}.muhurtham` as MessageKey),
      start: w.start.jdUt, end: w.end.jdUt,
      location: placeName(place, lang),
      description: t('ics.description'),
      ...(alarmMinutes !== undefined && { alarmMinutes }),
    });
    downloadIcs(ics, `astroz-${event}-${w.date}.ics`);
  };
}
