// Birth details form (design/handoff BirthForm): name, gender, date, time + "time not known",
// offline birthplace search, relation chips. Validation only; no astrology here.
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { useT, type MessageKey } from '../i18n';
import { useSettings } from '../store/settings';
import { placeLabel, placeName, searchPlaces, type Place } from '../places';
import { RELATION_CHOICES, type Gender, type RelationChoice } from '../profiles';
import { Button } from './Button';
import { Icon } from './Icon';
import s from './BirthForm.module.css';

export type BirthFormValues = {
  name: string;
  gender: Gender;
  relation: RelationChoice;
  date: string; // YYYY-MM-DD or ''
  time: string; // HH:mm or ''
  timeUnknown: boolean;
  place: Place;
};

type Errors = Partial<Record<'name' | 'date', MessageKey>>;

/** Earliest date the bundled ephemeris files cover (swisseph .se1, 1800–2400). */
const MIN_DATE = '1800-01-01';

export function validate(v: BirthFormValues, today: string): Errors {
  const e: Errors = {};
  if (!v.name.trim()) e.name = 'form.nameError';
  if (v.date && (!/^\d{4}-\d{2}-\d{2}$/.test(v.date) || v.date < MIN_DATE || v.date > today)) e.date = 'form.dateError';
  return e;
}

type Props = { initial: BirthFormValues; today: string; submitLabel: string; onSubmit: (v: BirthFormValues) => void };

export function BirthForm({ initial, today, submitLabel, onSubmit }: Props) {
  const t = useT();
  const lang = useSettings((st) => st.lang);
  const uid = useId();
  const [v, setV] = useState<BirthFormValues>(initial);
  const [errors, setErrors] = useState<Errors>({});
  const [query, setQuery] = useState(placeLabel(initial.place, lang));
  const [results, setResults] = useState<Place[]>([]);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const nameRef = useRef<HTMLInputElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof BirthFormValues>(k: K, value: BirthFormValues[K]) => setV((x) => ({ ...x, [k]: value }));

  useEffect(() => {
    if (!open) return;
    let live = true;
    searchPlaces(query).then((r) => { if (live) { setResults(r); setHighlight(0); } }).catch(() => undefined);
    return () => { live = false; };
  }, [query, open]);

  const choosePlace = (p: Place) => {
    set('place', p);
    setQuery(placeLabel(p, lang));
    setOpen(false);
  };

  const submit = (ev: FormEvent) => {
    ev.preventDefault();
    const e = validate(v, today);
    setErrors(e);
    if (e.name) nameRef.current?.focus();
    else if (e.date) dateRef.current?.focus();
    if (!e.name && !e.date) onSubmit({ ...v, name: v.name.trim(), time: v.timeUnknown ? '' : v.time });
  };

  const genders: { value: Gender; label: MessageKey }[] = [
    { value: 'f', label: 'gender.f' },
    { value: 'm', label: 'gender.m' },
    { value: 'x', label: 'gender.x' },
  ];
  const errorCount = Object.keys(errors).length;
  const id = (k: string) => `${uid}-${k}`;

  return (
    <form className={s.form} onSubmit={submit} noValidate>
      {errorCount ? (
        <div className={s.alert} role="alert">
          <span className={s.alertIcon}><Icon name="half-diya" size={20} /></span>
          {t('form.alert')}
        </div>
      ) : null}

      <div className={errors.name ? `${s.field} ${s.hasError}` : s.field}>
        <label className={s.label} htmlFor={id('name')}>{t('form.name')}</label>
        <input ref={nameRef} id={id('name')} className={s.input} value={v.name} autoComplete="off" placeholder={t('form.namePlaceholder')}
          aria-invalid={errors.name ? true : undefined} aria-describedby={errors.name ? id('name-err') : undefined}
          onChange={(e) => set('name', e.target.value)} />
        {errors.name ? <span className={s.error} id={id('name-err')}><Icon name="crossed-circle" size={16} />{t(errors.name)}</span> : null}
      </div>

      <div className={s.field}>
        <span className={s.label} id={id('gender')}>{t('form.gender')}</span>
        <div className={s.seg} role="radiogroup" aria-labelledby={id('gender')}>
          {genders.map((g) => (
            <button key={g.value} type="button" role="radio" aria-checked={v.gender === g.value} className={s.segOpt} onClick={() => set('gender', g.value)}>
              {t(g.label)}
            </button>
          ))}
        </div>
      </div>

      <div className={errors.date ? `${s.field} ${s.hasError}` : s.field}>
        <label className={s.label} htmlFor={id('date')}>{t('form.date')}</label>
        <div className={s.wrap}>
          <span className={s.wrapIcon}><Icon name="calendar" size={20} /></span>
          <input ref={dateRef} id={id('date')} className={`${s.input} az-times`} type="date" min={MIN_DATE} max={today} value={v.date}
            aria-invalid={errors.date ? true : undefined} aria-describedby={errors.date ? id('date-err') : undefined}
            onChange={(e) => set('date', e.target.value)} />
        </div>
        {errors.date ? <span className={s.error} id={id('date-err')}><Icon name="crossed-circle" size={16} />{t(errors.date)}</span> : null}
      </div>

      <div className={s.field}>
        <label className={s.label} htmlFor={id('time')}>{t('form.time')}</label>
        <div className={s.wrap}>
          <span className={s.wrapIcon}><Icon name="clock" size={20} /></span>
          <input id={id('time')} className={`${s.input} az-times`} type="time" value={v.timeUnknown ? '' : v.time} disabled={v.timeUnknown}
            onChange={(e) => set('time', e.target.value)} />
        </div>
        {v.timeUnknown ? null : <span className={s.hint}>{t('form.timeHint')}</span>}
      </div>

      <label className={s.switch}>
        <input type="checkbox" role="switch" checked={v.timeUnknown} onChange={(e) => set('timeUnknown', e.target.checked)} />
        <span className={s.track} aria-hidden="true"><span className={s.thumb} /></span>
        <span>{t('form.timeUnknown')}</span>
      </label>
      {v.timeUnknown ? (
        <div className={s.note}>
          <span className={s.noteIcon}><Icon name="clock" size={20} /></span>
          <span>{t('form.timeUnknownNote')}</span>
        </div>
      ) : null}

      <div className={s.field}>
        <label className={s.label} htmlFor={id('place')}>{t('form.place')}</label>
        <div className={s.wrap}>
          <span className={s.wrapIcon}><Icon name="search" size={20} /></span>
          <input id={id('place')} className={s.input} value={query} autoComplete="off" placeholder={t('form.placePlaceholder')}
            role="combobox" aria-expanded={open && results.length > 0} aria-controls={id('places')} aria-autocomplete="list"
            onFocus={(e) => e.target.select()}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onKeyDown={(e) => {
              if (!open || !results.length) return;
              if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight((h) => Math.min(h + 1, results.length - 1)); }
              if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight((h) => Math.max(h - 1, 0)); }
              if (e.key === 'Enter') { e.preventDefault(); choosePlace(results[highlight]!); }
              if (e.key === 'Escape') setOpen(false);
            }} />
        </div>
        <span className={s.hint}>{t('form.placeHint')}</span>
      </div>
      {open && results.length ? (
        <ul className={s.results} role="listbox" id={id('places')} aria-label={t('form.place')}>
          {results.map((p, i) => (
            <li key={p.id} role="option" aria-selected={i === highlight} className={s.result}
              onMouseDown={(e) => e.preventDefault()} onClick={() => choosePlace(p)}>
              <span className={s.resultIcon}><Icon name="location" size={20} /></span>
              <span><b>{placeName(p, lang)}</b><small>{[p.admin, p.cc].filter(Boolean).join(', ')}</small></span>
            </li>
          ))}
        </ul>
      ) : null}

      <div className={s.field}>
        <span className={s.label} id={id('rel')}>{t('form.relation')}</span>
        <div className={s.rel} role="radiogroup" aria-labelledby={id('rel')}>
          {RELATION_CHOICES.map((r) => (
            <button key={r.id} type="button" role="radio" aria-checked={v.relation === r.id} className={s.relOpt}
              onClick={() => setV((x) => ({ ...x, relation: r.id, gender: r.gender ?? x.gender }))}>
              {t(`rel.${r.id}`)}
            </button>
          ))}
        </div>
      </div>

      <Button type="submit" block>{submitLabel}</Button>
      <p className={s.privacy}><Icon name="lock" size={18} />{t('form.privacy')}</p>
    </form>
  );
}
