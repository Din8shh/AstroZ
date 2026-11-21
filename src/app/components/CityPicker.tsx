// A town chip that opens an offline search (public/data/cities.json) — used by the muhurtham finder and New house.
import { useEffect, useState } from 'react';
import { useT } from '../i18n';
import { placeLabel, placeName, searchPlaces, type Place } from '../places';
import { useSettings } from '../store/settings';
import { Icon } from './Icon';
import s from './CityPicker.module.css';

export function CityPicker({ place, onChange }: { place: Place; onChange: (p: Place) => void }) {
  const t = useT();
  const lang = useSettings((st) => st.lang);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  useEffect(() => {
    if (!open || !query.trim()) { setResults([]); return; }
    let live = true;
    searchPlaces(query).then((r) => { if (live) setResults(r); }).catch(() => undefined);
    return () => { live = false; };
  }, [open, query]);

  return (
    <div className={s.wrap}>
      <button type="button" className={s.chip} aria-expanded={open} aria-label={`${t('mh.cityChange')}: ${placeName(place, lang)}`} onClick={() => setOpen((o) => !o)}>
        <span className={s.icon}><Icon name="location" size={20} /></span>
        <span>{placeName(place, lang)}</span>
        <span className={s.chev}><Icon name="chevron-down" size={20} /></span>
      </button>
      {open ? (
        <div className={s.panel}>
          <input className={s.input} type="search" autoFocus value={query} placeholder={t('mh.citySearch')} aria-label={t('mh.citySearch')} onChange={(e) => setQuery(e.target.value)} />
          {results.length ? (
            <ul className={s.list} role="listbox" aria-label={t('mh.citySearch')}>
              {results.map((p) => (
                <li key={p.id}>
                  <button type="button" role="option" aria-selected={p.id === place.id} className={s.option} onClick={() => { onChange(p); setOpen(false); setQuery(''); }}>
                    {placeLabel(p, lang)}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
