// Settings (design/handoff SettingsTe / SettingsEn): display (language, default city, larger text, theme), your data,
// method, a note (disclaimer), about (version, privacy, free remedies only, source code — AGPL §13).
import pkg from '../../../package.json';
import { useT } from '../i18n';
import { Button } from '../components/Button';
import { CityPicker } from '../components/CityPicker';
import { Icon } from '../components/Icon';
import { LangToggle } from '../components/LangToggle';
import { usePlace } from '../hooks/useDay';
import { placeLabel } from '../places';
import { exportJson, useProfiles } from '../profiles';
import { hrefFor } from '../router';
import { useSettings } from '../store/settings';
import type { Theme } from '../types';
import { Screen, screenStyles } from './Screen';
import s from './More.module.css';

export const SOURCE_URL = 'https://github.com/Din8shh/AstroZ';

/** "More" tab opens Settings (docs/design-mapping.md §4.5). */
export function MoreScreen() {
  const t = useT();
  const lang = useSettings((st) => st.lang);
  const elder = useSettings((st) => st.elderText);
  const setElder = useSettings((st) => st.setElderText);
  const theme = useSettings((st) => st.theme);
  const setTheme = useSettings((st) => st.setTheme);
  const setHome = useSettings((st) => st.setHomePlaceId);
  const home = usePlace(useSettings((st) => st.homePlaceId));
  const profiles = useProfiles((st) => st.profiles);
  const deleteAll = useProfiles((st) => st.deleteAll);

  const exportFile = () => {
    const blob = new Blob([exportJson(profiles)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `astroz-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const confirmDelete = async () => {
    // The design's own warning text is the confirmation message.
    if (window.confirm(t('settings.deleteSub'))) await deleteAll();
  };

  return (
    <Screen title="settings.title" intro="settings.intro">
      <section className={s.section} aria-labelledby="display-h">
        <h2 className={s.h2} id="display-h">{t('settings.display')}</h2>
        <div className={s.card}>
          <div className={s.rowInline}>
            <div className={s.rowText}>
              <span className={s.rowTitle}>{t('settings.language')}</span>
              <span className={s.rowSub}>{t('settings.languageSub')}</span>
            </div>
            <LangToggle />
          </div>
          <div className={s.row}>
            <div className={s.rowText}>
              <span className={s.rowTitle}>{t('settings.city')}</span>
              <span className={s.rowSub}>{t('settings.citySub', { city: placeLabel(home, lang) })}</span>
            </div>
            <CityPicker place={home} onChange={(p) => setHome(p.id)} />
          </div>
          <div className={s.row}>
            <div className={s.rowInlineTop}>
              <div className={s.rowText}>
                <span className={s.rowTitle} id="elder-l">{t('settings.elder')}</span>
                <span className={s.rowSub}>{t('settings.elderSub')}</span>
              </div>
              <button type="button" role="switch" aria-checked={elder} aria-labelledby="elder-l" className={s.switch} onClick={() => setElder(!elder)}>
                <span className={s.knob} />
              </button>
            </div>
            <div className={s.preview} aria-hidden="true">
              <span className={s.previewLabel}>{t('settings.elderPreview')}</span>
              <span className={`${s.previewSample} az-elder`}>{t('settings.elderSample')} <b className="az-times">09:11 – 10:36</b></span>
            </div>
          </div>
          <div className={s.row}>
            <span className={s.rowTitle} id="theme-l">{t('settings.theme')}</span>
            <div className={s.choices} role="radiogroup" aria-labelledby="theme-l">
              {(['system', 'light', 'dark'] as Theme[]).map((th) => (
                <button key={th} type="button" role="radio" aria-checked={theme === th} className={s.choice} onClick={() => setTheme(th)}>{t(`settings.theme.${th}`)}</button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className={s.section} aria-labelledby="data-h">
        <h2 className={s.h2} id="data-h">{t('settings.yourData')}</h2>
        <div className={s.card}>
          <div className={s.row}>
            <div className={s.rowText}>
              <span className={s.rowTitle}>{t('settings.export')}</span>
              <span className={s.rowSub}>{t('settings.exportSub')}</span>
            </div>
            <Button variant="secondary" icon="share" onClick={exportFile} disabled={!profiles.length}>{t('settings.export')}</Button>
          </div>
          <div className={s.row}>
            <div className={s.rowText}>
              <span className={s.rowTitle}>{t('settings.deleteAll')}</span>
              <span className={s.rowSub}>{t('settings.deleteSub')}</span>
            </div>
            <Button variant="danger" icon="close" onClick={() => void confirmDelete()} disabled={!profiles.length}>{t('settings.deleteAll')}</Button>
          </div>
        </div>
      </section>

      <section className={s.section} aria-labelledby="method-h">
        <h2 className={s.h2} id="method-h">{t('settings.method')}</h2>
        <div className={s.card}>
          <div className={s.row}>
            <span className={s.rowTitle}>{t('settings.methodTitle')}</span>
            <ul className={s.bullets}>
              {(['settings.method1', 'settings.method2', 'settings.method3', 'settings.method4'] as const).map((k) => <li key={k}>{t(k)}</li>)}
            </ul>
            <a className={s.link} href={hrefFor('more', 'method')}>{t('settings.methodMore')}<Icon name="chevron-right" size={18} /></a>
          </div>
        </div>
      </section>

      <section className={s.section} aria-labelledby="note-h">
        <h2 className={s.h2} id="note-h">{t('settings.note')}</h2>
        <div className={s.card}>
          <div className={s.row}>
            <p className={screenStyles.note} style={{ margin: 0 }}>{t('disclaimer.body')}</p>
            <a className={s.link} href={hrefFor('more', 'disclaimer')}>{t('settings.readDisclaimer')}<Icon name="chevron-right" size={18} /></a>
          </div>
        </div>
      </section>

      <section className={s.section} aria-labelledby="about-h">
        <h2 className={s.h2} id="about-h">{t('settings.about')}</h2>
        <div className={s.card}>
          <div className={s.row}>
            <div className={s.rowText}>
              <span className={s.rowTitle}>{t('app.name')}</span>
              <span className={s.rowSub}>{t('settings.version', { version: pkg.version })}</span>
            </div>
          </div>
          <a className={`${s.row} ${s.rowLink}`} href={hrefFor('more', 'privacy')}>
            <span className={s.rowText}>
              <span className={s.rowTitle}>{t('settings.privacy')}</span>
              <span className={s.rowSub}>{t('settings.privacySub')}</span>
            </span>
          </a>
          <div className={s.row}>
            <div className={s.rowText}>
              <span className={s.rowTitle}>{t('settings.freeOnly')}</span>
              <span className={s.rowSub}>{t('settings.freeOnlySub')}</span>
            </div>
          </div>
          <a className={`${s.row} ${s.rowLink}`} href={SOURCE_URL} target="_blank" rel="noopener noreferrer" data-testid="source-link">
            <span className={s.rowText}>
              <span className={s.rowTitle}>{t('settings.source')}</span>
              <span className={s.rowSub}>{t('settings.sourceSub')}</span>
            </span>
          </a>
        </div>
      </section>
    </Screen>
  );
}
