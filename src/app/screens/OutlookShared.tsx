// Shared by Job and Income: the person picker and remedy lookup.
import { useEffect, useMemo, useState } from 'react';
import remedies from '../../content/remedies.json';
import { ProfileChip } from '../components/ProfileChip';
import type { TodoItem } from '../components/TodoList';
import { useT } from '../i18n';
import { relationChoice, useProfiles, type Profile } from '../profiles';
import type { Lang } from '../types';
import s from './Outlook.module.css';

/** Saved people that pass `ok`, and the chosen one (self first). In memory only. */
export function usePerson(ok: (p: Profile) => boolean): [Profile[], Profile | undefined, (id: string) => void] {
  const all = useProfiles((st) => st.profiles);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const people = useMemo(() => all.filter(ok), [all]);
  const [id, setId] = useState<string | null>(null);
  useEffect(() => {
    if (id && people.some((p) => p.id === id)) return;
    setId((people.find((p) => p.relation === 'self') ?? people[0])?.id ?? null);
  }, [people, id]);
  return [people, people.find((p) => p.id === id), setId];
}

export function PersonPicker({ people, selected, onPick, sub }: { people: Profile[]; selected: Profile | undefined; onPick: (id: string) => void; sub?: (p: Profile) => string }) {
  const t = useT();
  return (
    <div className={s.people} role="group">
      {people.map((p) => (
        <ProfileChip key={p.id} name={p.name} sub={sub ? sub(p) : t(`rel.${relationChoice(p)}`)} selected={p.id === selected?.id} onClick={() => onPick(p.id)} />
      ))}
    </div>
  );
}

/** Free remedies (content/remedies.json) as to-do items. */
export function remedyItems(ids: string[], lang: Lang): TodoItem[] {
  return ids.map((id) => remedies.items.find((r) => r.id === id)).filter((r): r is (typeof remedies.items)[number] => !!r).map((r) => {
    const when = (r as { when?: { te: string; en: string } }).when;
    return { id: r.id, text: lang === 'te' ? r.te : r.en, when: when ? (lang === 'te' ? when.te : when.en) : undefined, free: r.free };
  });
}
