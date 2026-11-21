import { useSyncExternalStore } from 'react';
import { useT } from '../i18n';
import { Icon } from './Icon';
import s from './OfflineBanner.module.css';

function subscribe(cb: () => void) {
  window.addEventListener('online', cb);
  window.addEventListener('offline', cb);
  return () => { window.removeEventListener('online', cb); window.removeEventListener('offline', cb); };
}

export function OfflineBanner() {
  const online = useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
  const t = useT();
  if (online) return null;
  return (
    <div className={s.banner} role="status" data-testid="offline-banner">
      <span className={s.icon}><Icon name="offline" /></span>
      <div className={s.text}>
        <span className={s.title}>{t('offline.title')}</span>
        <span className={s.body}>{t('offline.body')}</span>
      </div>
    </div>
  );
}
