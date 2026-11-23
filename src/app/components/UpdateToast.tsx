// "A new version is ready" (SPEC §10 update toast). The waiting service worker takes over only when tapped.
import { useT } from '../i18n';
import { useUpdate } from '../pwa';
import s from './UpdateToast.module.css';

export function UpdateToast() {
  const t = useT();
  const { ready, apply, dismiss } = useUpdate();
  if (!ready) return null;
  return (
    <div className={s.toast} role="status" data-testid="update-toast">
      <span className={s.text}>{t('update.ready')}</span>
      <div className={s.actions}>
        <button type="button" className={s.later} onClick={dismiss}>{t('update.later')}</button>
        <button type="button" className={s.now} onClick={apply}>{t('update.reload')}</button>
      </div>
    </div>
  );
}
