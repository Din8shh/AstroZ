// Add or edit a person (design/handoff AddPerson*.dc.html).
import { useEffect, useState } from 'react';
import { BirthForm, type BirthFormValues } from '../components/BirthForm';
import { SubHeader } from '../components/SubHeader';
import { useT } from '../i18n';
import { DEFAULT_PLACE, placeById, type Place } from '../places';
import { newId, RELATION_CHOICES, relationChoice, useProfiles, type Profile } from '../profiles';
import { hrefFor, navigate } from '../router';
import { useSettings } from '../store/settings';
import { todayIn } from '../dates';
import s from './Family.module.css';

export function PersonFormScreen({ id }: { id?: string | undefined }) {
  const t = useT();
  const existing = useProfiles((st) => st.profiles.find((p) => p.id === id));
  const hasSelf = useProfiles((st) => st.profiles.some((p) => p.relation === 'self' && p.id !== id));
  const save = useProfiles((st) => st.save);
  const homePlaceId = useSettings((st) => st.homePlaceId);
  const [initial, setInitial] = useState<BirthFormValues | null>(null);

  useEffect(() => {
    let live = true;
    placeById(existing?.birth?.placeId ?? homePlaceId).then((place?: Place) => {
      if (!live) return;
      setInitial({
        name: existing?.name ?? '',
        gender: existing?.gender ?? 'f',
        relation: existing ? relationChoice(existing) : hasSelf ? 'other' : 'self',
        date: existing?.birth?.date ?? '',
        time: existing?.birth?.time ?? '',
        timeUnknown: existing?.birth ? !existing.birth.timeKnown : false,
        place: place ?? DEFAULT_PLACE,
      });
    }).catch(() => undefined);
    return () => { live = false; };
  }, [existing, homePlaceId, hasSelf]);

  const submit = async (v: BirthFormValues) => {
    const choice = RELATION_CHOICES.find((r) => r.id === v.relation)!;
    const timeKnown = !v.timeUnknown && !!v.time;
    const profile: Profile = {
      id: existing?.id ?? newId(),
      name: v.name,
      relation: choice.relation,
      gender: choice.gender ?? v.gender,
      ...(v.date && { birth: { date: v.date, ...(timeKnown && { time: v.time }), timeKnown, placeId: v.place.id } }),
      createdAt: existing?.createdAt ?? Date.now(),
    };
    // Same birth details: keep the saved rasi/nakshatra (Reveal refreshes them; the name-based nama nakshatra may change).
    const b = existing?.birth, nb = profile.birth;
    if (existing?.derived && b && nb && b.date === nb.date && b.time === nb.time && b.timeKnown === nb.timeKnown && b.placeId === nb.placeId) {
      const { namaNakshatra: _n, ...keep } = existing.derived;
      profile.derived = existing.name === profile.name ? existing.derived : keep;
    }
    await save(profile);
    navigate('family', profile.id, 'reveal');
  };

  return (
    <div className={s.formScreen}>
      <SubHeader title={t(existing ? 'form.editTitle' : 'form.addTitle')} backHref={hrefFor('family')} />
      <main className={s.formMain} id="main">
        <p className={s.intro}>{t('form.intro')}</p>
        {initial ? <BirthForm key={existing?.id ?? 'new'} initial={initial} today={todayIn(initial.place.tz)} submitLabel={t('form.submit')} onSubmit={submit} /> : null}
      </main>
    </div>
  );
}
