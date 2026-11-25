// Family: everyone saved on this phone (design/handoff FamilyTe.dc.html).
import { Icon } from '../components/Icon';
import { buttonClass } from '../components/Button';
import { initialOf } from '../components/ProfileChip';
import { useName, useT } from '../i18n';
import { useNames } from '../hooks/useEngine';
import { relationChoice, useProfiles, type Profile } from '../profiles';
import { hrefFor } from '../router';
import s from './Family.module.css';

export function FamilyScreen() {
  const t = useT();
  const profiles = useProfiles((st) => st.profiles);
  return (
    <main className={s.main} id="main">
      <div className={s.head}>
        <h1 className={s.title}>{t('family.title')}</h1>
        {profiles.length ? <p className={s.intro}>{t('family.intro')}</p> : null}
      </div>
      {profiles.length ? (
        <section className={`${s.card} az-stagger`} aria-label={t('family.listLabel')}>
          {profiles.map((p) => <PersonRow key={p.id} p={p} />)}
        </section>
      ) : null}
      <a className={buttonClass('primary', true)} href={hrefFor('family', 'new')}>
        <Icon name="plus" size={20} />
        <span>{t('family.add')}</span>
      </a>
      <p className={s.privacy}>
        <span className={s.gold}><Icon name="lock" size={20} /></span>
        {t('family.privacy')}
      </p>
    </main>
  );
}

function PersonRow({ p }: { p: Profile }) {
  const t = useT();
  const name = useName();
  const names = useNames();
  const d = p.derived ?? {};
  const nak = d.nakshatra && names?.nakshatras[d.nakshatra - 1];
  const rasi = d.rasi && names?.rasisCompound[d.rasi - 1];
  const lagna = p.birth?.timeKnown && d.lagna ? names?.rasisCompound[d.lagna - 1] : undefined;
  const nama = d.namaNakshatra?.map((n) => names?.nakshatras[n - 1]).filter(Boolean).map((x) => name(x!)).join(' / ');
  const href = p.birth ? hrefFor('family', p.id, 'reveal') : hrefFor('family', p.id, 'edit');

  return (
    <a className={s.row} href={href} data-testid="person-row">
      <span className={s.avatar} aria-hidden="true">{initialOf(p.name)}</span>
      <span className={s.rowText}>
        <span className={s.rowName}>{p.name} <span className={s.rowRel}>· {t(`rel.${relationChoice(p)}`)}</span></span>
        {p.birth ? (
          <span className={s.rowSub}>
            {[nak && name(nak), rasi && t('family.rasi', { rasi: name(rasi) }), lagna && t('family.lagna', { lagna: name(lagna) })].filter(Boolean).join(' · ')}
          </span>
        ) : (
          <span className={s.rowSub}>{t('family.nameOnly', { nakshatra: nama ?? '—' })}</span>
        )}
        {p.birth && !p.birth.timeKnown ? <span className={s.approx}><Icon name="clock" size={16} />{t('family.approxTimeUnknown')}</span> : null}
        {!p.birth ? <span className={s.link}>{t('family.addBirth')}</span> : null}
      </span>
      <span className={s.chev}><Icon name="chevron-right" size={20} /></span>
    </a>
  );
}
