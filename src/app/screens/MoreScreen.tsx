import { useT } from '../i18n';
import { Button } from '../components/Button';
import { exportJson, useProfiles } from '../profiles';
import { Screen, screenStyles } from './Screen';
import s from './More.module.css';

/** "More" tab opens Settings (docs/design-mapping.md §4.5). */
export function MoreScreen() {
  const t = useT();
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
      <p className={screenStyles.note}>{t('disclaimer.body')}</p>
    </Screen>
  );
}
